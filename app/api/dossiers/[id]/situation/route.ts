export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// Recopie locale du contrat de `lib/situation.ts` — V2-37 valide ces clés
// strictement côté serveur sans dependre du module client.
const SITUATION_KEYS = [
  "salaries",
  "locaux_loues",
  "acquereur_type",
  "marque_enseigne",
  "activite_reglementee",
] as const;

const ACQUEREUR_VALUES = [
  "physique",
  "societe_existante",
  "societe_creation",
] as const;

type SituationKey = (typeof SITUATION_KEYS)[number];
type AcquereurValue = (typeof ACQUEREUR_VALUES)[number];

type SituationDeclaree = {
  salaries?: boolean | null;
  locaux_loues?: boolean | null;
  acquereur_type?: AcquereurValue | null;
  marque_enseigne?: boolean | null;
  activite_reglementee?: boolean | null;
};

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

function isAcquereurValue(value: unknown): value is AcquereurValue {
  return (
    typeof value === "string" &&
    (ACQUEREUR_VALUES as readonly string[]).includes(value)
  );
}

function isBooleanOrNull(value: unknown): value is boolean | null {
  return typeof value === "boolean" || value === null;
}

function validateSituation(
  raw: Record<string, unknown>
): { ok: true; value: SituationDeclaree } | { ok: false; error: string } {
  const allowed = new Set<string>(SITUATION_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return { ok: false, error: `Clé non autorisée : ${key}` };
    }
  }

  const result: SituationDeclaree = {};

  for (const key of SITUATION_KEYS) {
    if (!(key in raw)) continue;
    const value = raw[key];
    if (value === undefined) continue;

    if (key === "acquereur_type") {
      if (value === null) {
        result.acquereur_type = null;
      } else if (isAcquereurValue(value)) {
        result.acquereur_type = value;
      } else {
        return { ok: false, error: "acquereur_type invalide." };
      }
      continue;
    }

    if (!isBooleanOrNull(value)) {
      return { ok: false, error: `${key} doit être boolean ou null.` };
    }

    (result as Record<SituationKey, boolean | null | AcquereurValue>)[key] =
      value;
  }

  return { ok: true, value: result };
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!IS_UUID.test(id)) {
    return NextResponse.json(
      { error: "Identifiant de dossier invalide." },
      { status: 400 }
    );
  }

  const rateLimit = checkRateLimit(
    `${getClientIp(req)}:dossiers-situation:${id}`
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Payload doit être un objet JSON." },
      { status: 400 }
    );
  }

  const validation = validateSituation(body as Record<string, unknown>);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data: cession, error: cessionError } = await supabaseAdmin
    .from("cessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (cessionError) {
    console.warn(
      `[dossiers-situation] Verification dossier impossible (${cessionError.message}).`
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

  const { error: updateError } = await supabaseAdmin
    .from("cessions")
    .update({
      situation_declaree: validation.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.warn(
      `[dossiers-situation] Update echoue : ${updateError.message}`
    );
    return NextResponse.json(
      { error: "Mise a jour impossible." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
