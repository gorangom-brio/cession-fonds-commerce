export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf-text-extractor";
import { extraire } from "@/lib/extractors";
import type { StructuredExtractionResponse } from "@/lib/extractors/types";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 2;
const MAX_PDF_FILES_PER_EXTRACTION = 5;
const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type RouteParams = { params: Promise<{ id: string }> };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type DocumentNonAnalyse = {
  document_id: string;
  nom_fichier: string;
  raison: string;
};

type StructuredExtractionApiResponse = StructuredExtractionResponse & {
  messages?: string[];
  documents_non_analyses?: DocumentNonAnalyse[];
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
    `${getClientIp(req)}:structured-extraction:${id}`
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

  const results: StructuredExtractionResponse["documents"] = [];
  const messages: string[] = [];
  const documentsNonAnalyses: DocumentNonAnalyse[] = [];

  let processedEligiblePdfs = 0;
  let skippedBySize = 0;
  let skippedByLimit = 0;

  for (const doc of pdfs) {
    if (doc.taille_octets > MAX_PDF_FILE_SIZE_BYTES) {
      skippedBySize += 1;
      documentsNonAnalyses.push({
        document_id: doc.id,
        nom_fichier: doc.nom_fichier,
        raison: "Fichier non analyse automatiquement : depasse 10 Mo.",
      });
      continue;
    }

    if (processedEligiblePdfs >= MAX_PDF_FILES_PER_EXTRACTION) {
      skippedByLimit += 1;
      documentsNonAnalyses.push({
        document_id: doc.id,
        nom_fichier: doc.nom_fichier,
        raison: `Traitement limite : seuls les ${MAX_PDF_FILES_PER_EXTRACTION} premiers PDF eligibles sont analyses automatiquement.`,
      });
      continue;
    }

    processedEligiblePdfs += 1;

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !blob) {
      results.push({
        id: doc.id,
        nom_fichier: doc.nom_fichier,
        type_document: doc.type_document,
        extraction: {
          type: doc.type_document ?? "inconnu",
          non_extractible: true,
          raison: "texte_insuffisant",
        },
      });
      continue;
    }

    const buffer = await blob.arrayBuffer();
    const { text } = await extractPdfText(buffer);

    results.push({
      id: doc.id,
      nom_fichier: doc.nom_fichier,
      type_document: doc.type_document,
      extraction: extraire(doc.type_document, text),
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

  const response: StructuredExtractionApiResponse = {
    cession_id: id,
    documents: results,
    messages,
    documents_non_analyses: documentsNonAnalyses,
  };

  return NextResponse.json(response);
}
