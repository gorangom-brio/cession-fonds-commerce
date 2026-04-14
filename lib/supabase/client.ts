import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Client Supabase côté navigateur — utilise la clé anon publique.
 * Sûr à importer depuis n'importe quel composant `"use client"`.
 */
export const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// CESSIONS
// ============================================================================

export async function createCession() {
  const { data, error } = await supabaseClient
    .from("cessions")
    .insert({ status: "draft" })
    .select()
    .single();
  if (error) throw new Error(`Erreur création cession: ${error.message}`);
  return data;
}

export async function getCession(id: string) {
  const { data, error } = await supabaseClient
    .from("cessions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Erreur lecture cession: ${error.message}`);
  return data;
}

export async function updateCession(
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabaseClient
    .from("cessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Erreur mise à jour cession: ${error.message}`);
  return data;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function uploadDocument(
  cessionId: string,
  file: File,
  documentType?: string
) {
  const storagePath = `${cessionId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("documents")
    .upload(storagePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

  const { data, error: dbError } = await supabaseClient
    .from("documents")
    .insert({
      cession_id: cessionId,
      nom_fichier: file.name,
      type_document: documentType ?? null,
      storage_path: storagePath,
      taille_octets: file.size,
      analyse_effectuee: false,
    })
    .select()
    .single();
  if (dbError) throw new Error(`Erreur enregistrement: ${dbError.message}`);
  return data;
}

export async function getDocuments(cessionId: string) {
  const { data, error } = await supabaseClient
    .from("documents")
    .select("*")
    .eq("cession_id", cessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Erreur lecture documents: ${error.message}`);
  return data ?? [];
}

export async function downloadDocument(storagePath: string) {
  const { data, error } = await supabaseClient.storage
    .from("documents")
    .download(storagePath);
  if (error) throw new Error(`Erreur téléchargement: ${error.message}`);
  return data;
}

export async function deleteDocument(documentId: string, storagePath: string) {
  const { error: storageError } = await supabaseClient.storage
    .from("documents")
    .remove([storagePath]);
  if (storageError)
    throw new Error(`Erreur suppression fichier: ${storageError.message}`);

  const { error: dbError } = await supabaseClient
    .from("documents")
    .delete()
    .eq("id", documentId);
  if (dbError)
    throw new Error(`Erreur suppression enregistrement: ${dbError.message}`);
}
