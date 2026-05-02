export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin, updateDocumentExtraction } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf-text-extractor";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXTRAIT_MAX = 1500;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 2;
const MAX_PDF_FILES_PER_EXTRACTION = 5;
const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type RouteParams = { params: Promise<{ id: string }> };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();

  if (rateLimitStore.size > 1000) {
    for (const [entryKey, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(entryKey);
      }
    }
  }

  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!IS_UUID.test(id)) {
    return NextResponse.json(
      { error: "Identifiant de dossier invalide." },
      { status: 400 }
    );
  }

  const rateLimit = checkRateLimit(
    `${getClientIp(req)}:extract-text:${id}`
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const { data: documents, error: dbError } = await supabaseAdmin
    .from("documents")
    .select("id, nom_fichier, storage_path, type_document, taille_octets")
    .eq("cession_id", id)
    .order("created_at", { ascending: true });

  if (dbError) {
    return NextResponse.json(
      { error: "Impossible de récupérer les documents." },
      { status: 500 }
    );
  }

  const pdfs = (documents ?? []).filter((doc) =>
    doc.nom_fichier.toLowerCase().endsWith(".pdf")
  );

  const results: Array<{
    document_id: string;
    nom_fichier: string;
    type_document: string | null;
    nb_caracteres_extraits: number;
    extrait: string | null;
    extraction_ok: boolean;
    erreur: string | null;
    message: string | null;
  }> = [];
  const messages: string[] = [];

  let processedEligiblePdfs = 0;
  let skippedBySize = 0;
  let skippedByLimit = 0;

  for (const doc of pdfs) {
    if (doc.taille_octets > MAX_PDF_FILE_SIZE_BYTES) {
      skippedBySize += 1;
      results.push({
        document_id: doc.id,
        nom_fichier: doc.nom_fichier,
        type_document: doc.type_document,
        nb_caracteres_extraits: 0,
        extrait: null,
        extraction_ok: false,
        erreur: null,
        message:
          "Fichier non analysé automatiquement : dépasse 10 Mo.",
      });
      continue;
    }

    if (processedEligiblePdfs >= MAX_PDF_FILES_PER_EXTRACTION) {
      skippedByLimit += 1;
      continue;
    }

    processedEligiblePdfs += 1;

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !blob) {
      results.push({
        document_id: doc.id,
        nom_fichier: doc.nom_fichier,
        type_document: doc.type_document,
        nb_caracteres_extraits: 0,
        extrait: null,
        extraction_ok: false,
        erreur: "Téléchargement échoué.",
        message: "Document à vérifier.",
      });
      continue;
    }

    const buffer = await blob.arrayBuffer();
    const extraction = await extractPdfText(buffer);

    updateDocumentExtraction(
      doc.id,
      extraction.nb_caracteres,
      extraction.extraction_ok
    ).catch((err) =>
      console.warn(
        `[extract-text] Persistance échouée pour ${doc.id}:`,
        err
      )
    );

    results.push({
      document_id: doc.id,
      nom_fichier: doc.nom_fichier,
      type_document: doc.type_document,
      nb_caracteres_extraits: extraction.nb_caracteres,
      extrait: extraction.extraction_ok
        ? extraction.text.slice(0, EXTRAIT_MAX)
        : null,
      extraction_ok: extraction.extraction_ok,
      erreur: extraction.erreur ?? null,
      message:
        extraction.extraction_ok && extraction.nb_caracteres === 0
          ? "PDF non lisible automatiquement."
          : extraction.extraction_ok
            ? null
            : "Extraction à vérifier.",
    });
  }

  if (skippedByLimit > 0) {
    messages.push(
      `Traitement limite aux ${MAX_PDF_FILES_PER_EXTRACTION} premiers PDF eligibles du dossier.`
    );
  }

  if (skippedBySize > 0) {
    messages.push(
      `${skippedBySize} fichier(s) n'ont pas ete analyses automatiquement car ils depassent 10 Mo.`
    );
  }

  return NextResponse.json({
    cession_id: id,
    documents: results,
    messages,
  });
}
