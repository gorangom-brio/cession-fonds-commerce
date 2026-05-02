export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { classifierDocument } from "@/lib/document-classifier";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const NOM_FICHIER_MAX = 255;
const FILE_SIZE_MAX_BYTES = 10 * 1024 * 1024;
const DOSSIER_MAX_DOCUMENTS = 50;
const DOSSIER_MAX_TOTAL_BYTES = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

type RouteParams = { params: Promise<{ id: string }> };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ClientPayload = {
  nom_fichier?: unknown;
  taille_octets?: unknown;
  mime_type?: unknown;
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

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

function sanitizeFileName(fileName: string): string {
  // Retire les segments de chemin et normalise les espaces.
  const base = fileName.replace(/[\\/]/g, "_").trim();
  // Conserve uniquement caractères ASCII raisonnables ; remplace les autres.
  return base
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, NOM_FICHIER_MAX);
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
    `${getClientIp(req)}:documents-prepare:${id}`
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Reessayez dans quelques minutes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  let body: ClientPayload;
  try {
    body = (await req.json()) as ClientPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  if (
    typeof body.nom_fichier !== "string" ||
    body.nom_fichier.trim().length === 0 ||
    body.nom_fichier.length > NOM_FICHIER_MAX
  ) {
    return NextResponse.json({ error: "Nom de fichier invalide." }, { status: 400 });
  }

  const extension = getExtension(body.nom_fichier);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: "Extension non autorisee." },
      { status: 400 }
    );
  }

  if (
    typeof body.taille_octets !== "number" ||
    !Number.isFinite(body.taille_octets) ||
    body.taille_octets <= 0
  ) {
    return NextResponse.json({ error: "Taille invalide." }, { status: 400 });
  }

  if (body.taille_octets > FILE_SIZE_MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux." },
      { status: 400 }
    );
  }

  if (
    body.mime_type !== undefined &&
    body.mime_type !== null &&
    typeof body.mime_type !== "string"
  ) {
    return NextResponse.json({ error: "Type MIME invalide." }, { status: 400 });
  }

  const nomFichierOriginal = body.nom_fichier;
  const tailleAnnoncee = body.taille_octets;

  const { data: cession, error: cessionError } = await supabaseAdmin
    .from("cessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (cessionError) {
    console.warn(
      `[documents-prepare] Verification dossier impossible (${cessionError.message}).`
    );
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 500 }
    );
  }

  if (!cession) {
    return NextResponse.json(
      { error: "Dossier introuvable." },
      { status: 404 }
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("documents")
    .select("taille_octets")
    .eq("cession_id", id);

  if (existingError) {
    console.warn(
      `[documents-prepare] Lecture quotas impossible (${existingError.message}).`
    );
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 500 }
    );
  }

  const docsExistants = existing ?? [];
  if (docsExistants.length >= DOSSIER_MAX_DOCUMENTS) {
    return NextResponse.json(
      { error: "Quota documents atteint pour ce dossier." },
      { status: 409 }
    );
  }

  const totalActuel = docsExistants.reduce(
    (sum, doc) => sum + (doc.taille_octets ?? 0),
    0
  );
  if (totalActuel + tailleAnnoncee > DOSSIER_MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "Quota stockage atteint pour ce dossier." },
      { status: 409 }
    );
  }

  const safeFileName = sanitizeFileName(nomFichierOriginal);
  const storagePath = `${id}/${randomUUID()}-${safeFileName}`;
  const typeDocument = classifierDocument(nomFichierOriginal);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("documents")
    .insert({
      cession_id: id,
      nom_fichier: nomFichierOriginal,
      type_document: typeDocument,
      storage_path: storagePath,
      taille_octets: tailleAnnoncee,
      analyse_effectuee: false,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.warn(
      `[documents-prepare] Insert pending echoue : ${insertError?.message ?? "inconnu"}`
    );
    return NextResponse.json(
      { error: "Preparation impossible." },
      { status: 500 }
    );
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUploadUrl(storagePath);

  if (signedError || !signed) {
    console.warn(
      `[documents-prepare] Signed URL echouee : ${signedError?.message ?? "inconnu"}`
    );
    // Compense en supprimant la ligne pending pour eviter un orphelin DB.
    await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", inserted.id);
    return NextResponse.json(
      { error: "Preparation impossible." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      upload_id: inserted.id,
      signed_url: signed.signedUrl,
      token: signed.token,
      storage_path: storagePath,
      type_document: typeDocument,
    },
    { status: 201 }
  );
}
