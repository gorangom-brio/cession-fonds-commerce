export const runtime = "nodejs";

import { NextResponse } from "next/server";

// V2-36 — Route legacy neutralisée.
//
// Avant V2-35, cette route recevait l'appel client `fire-and-forget` qui
// déclenchait le webhook interne (Make / Slack / Zapier / n8n) après une
// insertion `validation_requests` faite côté browser via la clé anon.
//
// Depuis V2-35, l'insertion en base ET l'envoi du webhook sont effectués
// par `POST /api/dossiers/[id]/validation-requests`, sous service-role,
// avec validation serveur des champs et vérification d'existence du dossier.
//
// V2-36 désactive donc la route historique :
//   - elle ne lit plus Supabase ;
//   - elle ne déclenche plus de webhook ;
//   - elle n'expose plus de secret ;
//   - elle ne consomme plus de rate-limit ;
//   - elle répond 410 Gone avec un pointeur explicite vers la route successeur.

const DEPRECATED_BODY = {
  error: "deprecated_route",
  message:
    "Cette route legacy est désactivée. Utilisez /api/dossiers/[id]/validation-requests.",
} as const;

const DEPRECATED_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function deprecatedResponse() {
  return NextResponse.json(DEPRECATED_BODY, {
    status: 410,
    headers: DEPRECATED_HEADERS,
  });
}

export function POST() {
  return deprecatedResponse();
}

export function GET() {
  return deprecatedResponse();
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...DEPRECATED_HEADERS,
      Allow: "OPTIONS",
    },
  });
}
