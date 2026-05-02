import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Lit une variable d'environnement et garantit un retour `string` strict.
 * Throw au premier appel si la variable est absente — le narrowing
 * `string | undefined → string` est ainsi propagé correctement à TypeScript.
 */
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} est manquante`);
  }
  return value;
}

type CessionRow = Database["public"]["Tables"]["cessions"]["Row"];
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

// V2-35 : insertReportLead et insertValidationRequest ont été déplacés côté
// serveur (routes /api/dossiers/[id]/report-leads et
// /api/dossiers/[id]/validation-requests). Aucun helper browser ne doit plus
// écrire directement dans report_leads ou validation_requests.
//
// V2-37 : createCession et updateCession ont à leur tour été déplacés côté
// serveur (routes POST /api/dossiers et PATCH /api/dossiers/[id]/situation).
// Le seul helper d'écriture browser restant est `uploadDocument`, qui sera
// traité en V2-38 (signed upload URL + metadata serveur).

/**
 * Type dérivé du retour réel de `createClient<Database>` (V2-31).
 * Évite l'incompatibilité avec `SupabaseClient<Database>` qui ne renseigne
 * qu'un seul des 4 paramètres génériques attendus depuis `@supabase/supabase-js@2.47`.
 */
type BrowserClient = ReturnType<typeof createClient<Database>>;

let browserClient: BrowserClient | null = null;

function getSupabaseClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createClient<Database>(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }

  return browserClient;
}

export async function getCession(id: string): Promise<CessionRow> {
  const { data, error } = await getSupabaseClient()
    .from("cessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(
      `Erreur lecture cession : ${error?.message ?? "cession introuvable"}`
    );
  }

  return data as CessionRow;
}

export async function uploadDocument(
  cessionId: string,
  file: File,
  documentType?: string
): Promise<DocumentRow> {
  const safeFileName = file.name.replace(/\s+/g, "-");
  const storagePath = `${cessionId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await getSupabaseClient().storage
    .from("documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erreur upload : ${uploadError.message}`);
  }

  const { data, error: dbError } = await getSupabaseClient()
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

  if (dbError || !data) {
    throw new Error(
      `Erreur enregistrement document : ${dbError?.message ?? "aucune donnée renvoyée"}`
    );
  }

  return data as DocumentRow;
}

export async function getDocuments(cessionId: string): Promise<DocumentRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("documents")
    .select("*")
    .eq("cession_id", cessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erreur lecture documents : ${error.message}`);
  }

  return (data ?? []) as DocumentRow[];
}

export async function deleteDocument(
  documentId: string,
  storagePath: string
): Promise<void> {
  const { error: storageError } = await getSupabaseClient().storage
    .from("documents")
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Erreur suppression fichier : ${storageError.message}`);
  }

  const { error: dbError } = await getSupabaseClient()
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (dbError) {
    throw new Error(`Erreur suppression document : ${dbError.message}`);
  }
}
