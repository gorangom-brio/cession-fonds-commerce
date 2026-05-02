export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

type RouteParams = { params: Promise<{ id: string }> };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ClientPayload = {
  upload_id?: unknown;
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

async function storageObjectExists(storagePath: string): Promise<boolean> {
  const slashIndex = storagePath.lastIndexOf("/");
  const prefix = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : "";
  const filename =
    slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .list(prefix, { search: filename, limit: 1 });

  if (error) {
    console.warn(
      `[documents-finalize] list Storage echoue (${error.message}).`
    );
    return false;
  }

  return (data ?? []).some((entry) => entry.name === filename);
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
    `${getClientIp(req)}:documents-finalize:${id}`
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

  if (typeof body.upload_id !== "string" || !IS_UUID.test(body.upload_id)) {
    return NextResponse.json(
      { error: "upload_id invalide." },
      { status: 400 }
    );
  }

  const uploadId = body.upload_id;

  const { data: cession, error: cessionError } = await supabaseAdmin
    .from("cessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (cessionError) {
    console.warn(
      `[documents-finalize] Verification dossier impossible (${cessionError.message}).`
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

  const { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .select(
      "id, nom_fichier, type_document, taille_octets, storage_path, status, cession_id"
    )
    .eq("id", uploadId)
    .eq("cession_id", id)
    .maybeSingle();

  if (docError) {
    console.warn(
      `[documents-finalize] Lecture document impossible (${docError.message}).`
    );
    return NextResponse.json(
      { error: "Service indisponible." },
      { status: 500 }
    );
  }

  if (!doc) {
    return NextResponse.json(
      { error: "Upload introuvable pour ce dossier." },
      { status: 404 }
    );
  }

  if (doc.status === "ready") {
    return NextResponse.json(
      {
        success: true,
        document_id: doc.id,
        nom_fichier: doc.nom_fichier,
        type_document: doc.type_document,
        taille_octets: doc.taille_octets,
      },
      { status: 200 }
    );
  }

  const exists = await storageObjectExists(doc.storage_path);
  if (!exists) {
    return NextResponse.json(
      { error: "Objet Storage introuvable. Reessayez le televersement." },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("documents")
    .update({ status: "ready" })
    .eq("id", doc.id);

  if (updateError) {
    console.warn(
      `[documents-finalize] Update status echoue : ${updateError.message}`
    );
    return NextResponse.json(
      { error: "Finalisation impossible." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      document_id: doc.id,
      nom_fichier: doc.nom_fichier,
      type_document: doc.type_document,
      taille_octets: doc.taille_octets,
    },
    { status: 200 }
  );
}
