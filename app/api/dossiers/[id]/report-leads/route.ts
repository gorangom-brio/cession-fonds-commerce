export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const NOM_MAX = 120;
const EMAIL_MAX = 200;
const TELEPHONE_MAX = 30;

const ROLES = ["vendeur", "acquereur", "intermediaire", "autre"] as const;
type Role = (typeof ROLES)[number];

type RouteParams = { params: Promise<{ id: string }> };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ClientPayload = {
  nom?: unknown;
  email?: unknown;
  role?: unknown;
  telephone?: unknown;
  consentementRapport?: unknown;
  consentementRecontact?: unknown;
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

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!IS_UUID.test(id)) {
    return NextResponse.json(
      { error: "Identifiant de dossier invalide." },
      { status: 400 }
    );
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:report-leads:${id}`);

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
  if (!isRole(body.role)) {
    return NextResponse.json({ error: "Role invalide." }, { status: 400 });
  }
  if (body.consentementRapport !== true) {
    return NextResponse.json(
      { error: "Consentement rapport requis." },
      { status: 400 }
    );
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

  const consentementRecontact = body.consentementRecontact === true;

  const nom = body.nom.trim();
  const email = body.email.trim();
  const role: Role = body.role;

  const { data: cession, error: cessionError } = await supabaseAdmin
    .from("cessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (cessionError) {
    console.warn(
      `[report-leads] Verification dossier impossible (${cessionError.message}).`
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

  const { error: insertError } = await supabaseAdmin
    .from("report_leads")
    .insert({
      dossier_id: id,
      cession_id: id,
      nom,
      email,
      role,
      telephone,
      consentement_rapport: true,
      consentement_recontact: consentementRecontact,
      source: "rapport_pdf_demo",
    });

  if (insertError) {
    console.warn(`[report-leads] Insert echoue : ${insertError.message}`);
    return NextResponse.json(
      { error: "Enregistrement impossible." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
