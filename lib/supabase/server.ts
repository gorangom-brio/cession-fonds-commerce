import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Client Supabase côté serveur — utilise la clé service role.
 * Bypass les Row-Level Security policies. UNIQUEMENT pour les API routes
 * et les Server Components. Protégé par `import "server-only"` :
 * toute tentative d'import dans un composant `"use client"` échouera au build.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function markDocumentAnalysed(documentId: string) {
  const { error } = await supabaseAdmin
    .from("documents")
    .update({ analyse_effectuee: true })
    .eq("id", documentId);
  if (error) throw new Error(`Erreur marquage analyse: ${error.message}`);
}
