export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const WEBHOOK_TIMEOUT_MS = 5000;

const NOM_MAX = 120;
const EMAIL_MAX = 200;
const TELEPHONE_MAX = 30;
const MESSAGE_MAX = 5000;

type RouteParams = { params: Promise<{ id: string }> };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ClientPayload = {
  nom?: unknown;
  email?: unknown;
  telephone?: unknown;
  message?: unknown;
  consentement?: unknown;
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

function isNonEmptyBoundedString(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
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
    // pas d'environnement de requete disponible
  }
  return null;
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
    `${getClientIp(req)}:validation-requests:${id}`
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

  if (!isNonEmptyBoundedString(body.nom, NOM_MAX)) {
    return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  }
  if (
    !isNonEmptyBoundedString(body.email, EMAIL_MAX) ||
    !EMAIL_RE.test(body.email.trim())
  ) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (!isNonEmptyBoundedString(body.message, MESSAGE_MAX)) {
    return NextResponse.json({ error: "Message requis." }, { status: 400 });
  }
  if (body.consentement !== true) {
    return NextResponse.json({ error: "Consentement requis." }, { status: 400 });
  }

  let telephone: string | null = null;
  if (
    body.telephone !== undefined &&
    body.telephone !== null &&
    body.telephone !== ""
  ) {
    if (typeof body.telephone !== "string" || body.telephone.length > TELEPHONE_MAX) {
      return NextResponse.json({ error: "Telephone invalide." }, { status: 400 });
    }
    telephone = body.telephone;
  }

  const nom = body.nom.trim();
  const email = body.email.trim();
  const message = body.message.trim();

  const { data: cession, error: cessionError } = await supabaseAdmin
    .from("cessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (cessionError) {
    console.warn(
      `[validation-requests] Verification dossier impossible (${cessionError.message}).`
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

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("validation_requests")
    .insert({
      cession_id: id,
      dossier_id: id,
      nom,
      email,
      telephone,
      message,
      consentement: true,
      source: "validation-avocat",
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    console.warn(
      `[validation-requests] Insert echoue : ${insertError?.message ?? "inconnu"}`
    );
    return NextResponse.json(
      { error: "Enregistrement impossible." },
      { status: 500 }
    );
  }

  let notification_sent = false;
  const webhookUrl = process.env.VALIDATION_NOTIFY_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    const lienDossier = await buildLienDossier(id);
    const payload = {
      type: "validation_request",
      subject: "Nouvelle demande de validation avocat",
      dossier_id: id,
      nom,
      email,
      telephone,
      message,
      created_at: inserted.created_at,
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
        "[validation-requests] VALIDATION_NOTIFY_SECRET absent — webhook envoye sans en-tete secret."
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: outgoingHeaders,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      notification_sent = res.ok;
      if (!res.ok) {
        console.warn(
          `[validation-requests] Webhook a renvoye ${res.status} — demande deja persistee en base.`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[validation-requests] Echec d'appel webhook (${message}) — demande deja persistee en base.`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    console.info(
      "[validation-requests] VALIDATION_NOTIFY_WEBHOOK_URL non configuree — notification ignoree silencieusement."
    );
  }

  return NextResponse.json(
    {
      success: true,
      request_id: inserted.id,
      notification_sent,
    },
    { status: 201 }
  );
}
