export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";

const TIMEOUT_MS = 5000;

type ClientPayload = {
  dossier_id?: string;
  nom?: string;
  email?: string;
  telephone?: string | null;
  message?: string;
  created_at?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
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
    // ignore — pas d'environnement de requête disponible
  }
  return null;
}

export async function POST(req: Request) {
  let body: ClientPayload;
  try {
    body = (await req.json()) as ClientPayload;
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const webhookUrl = process.env.VALIDATION_NOTIFY_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.info(
      "[validation-notify] VALIDATION_NOTIFY_WEBHOOK_URL non configurée — notification ignorée silencieusement."
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!isNonEmptyString(body.dossier_id)) {
    console.warn(
      "[validation-notify] Payload invalide reçu — dossier_id manquant."
    );
    return NextResponse.json({ ok: true }, { status: 200 });
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
      "Demande à traiter manuellement — aucun mandat avocat automatique.",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(
        `[validation-notify] Webhook a renvoyé ${res.status} — demande déjà persistée en base.`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[validation-notify] Échec d'appel webhook (${message}) — demande déjà persistée en base.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
