export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";

const TIMEOUT_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClientPayload = {
  dossier_id?: string;
  nom?: string;
  email?: string;
  telephone?: string | null;
  message?: string;
  created_at?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

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

async function buildLienDossier(dossierId: string): Promise<string | null> {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, "")}/dossiers/${dossierId}`;
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) {
      return `${proto}://${host}/dossiers/${dossierId}`;
    }
  } catch {
    // ignore — pas d'environnement de requete disponible
  }
  return null;
}

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(
    `${getClientIp(req)}:validation-notify`
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

  if (!isNonEmptyString(body.dossier_id) || !IS_UUID.test(body.dossier_id)) {
    console.warn(
      "[validation-notify] Payload invalide recu — dossier_id invalide."
    );
    return NextResponse.json(
      { error: "Identifiant de dossier invalide." },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.VALIDATION_NOTIFY_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.info(
      "[validation-notify] VALIDATION_NOTIFY_WEBHOOK_URL non configuree — notification ignoree silencieusement."
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { data: cession, error: cessionError } = await supabaseAdmin
    .from("cessions")
    .select("id")
    .eq("id", body.dossier_id)
    .maybeSingle();

  if (cessionError) {
    console.warn(
      `[validation-notify] Verification dossier impossible (${cessionError.message}) — webhook non envoye.`
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!cession) {
    console.warn(
      "[validation-notify] Dossier introuvable — webhook non envoye."
    );
    return NextResponse.json(
      { error: "Dossier introuvable." },
      { status: 404 }
    );
  }

  const lienDossier = await buildLienDossier(body.dossier_id);

  const payload = {
    type: "validation_request",
    subject: "Nouvelle demande de validation avocat",
    dossier_id: body.dossier_id,
    nom: body.nom ?? null,
    email: body.email ?? null,
    telephone: body.telephone ?? null,
    message: body.message ?? null,
    created_at: body.created_at ?? new Date().toISOString(),
    lien_dossier: lienDossier,
    mention:
      "Demande a traiter manuellement — aucun mandat avocat automatique.",
  };

  const webhookSecret = process.env.VALIDATION_NOTIFY_SECRET?.trim();
  const outgoingHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (webhookSecret) {
    outgoingHeaders["X-Validation-Notify-Secret"] = webhookSecret;
  } else {
    console.info(
      "[validation-notify] VALIDATION_NOTIFY_SECRET absent — webhook envoye sans en-tete secret."
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: outgoingHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(
        `[validation-notify] Webhook a renvoye ${res.status} — demande deja persistee en base.`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[validation-notify] Echec d'appel webhook (${message}) — demande deja persistee en base.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
