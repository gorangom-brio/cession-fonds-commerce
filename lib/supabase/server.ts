import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL est manquante");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY est manquante");
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function markDocumentAnalysed(documentId: string) {
  const { error } = await supabaseAdmin
    .from("documents")
    .update({ analyse_effectuee: true })
    .eq("id", documentId);

  if (error) {
    throw new Error(`Erreur marquage analyse : ${error.message}`);
  }
}

export async function getDocumentsByCessionId(cessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("cession_id", cessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erreur lecture documents serveur : ${error.message}`);
  }

  return data ?? [];
}

export async function updateCessionAnalysis(
  cessionId: string,
  updates: Database["public"]["Tables"]["cessions"]["Update"]
) {
  const { data, error } = await supabaseAdmin
    .from("cessions")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur mise à jour analyse cession : ${error.message}`);
  }

  return data;
}
