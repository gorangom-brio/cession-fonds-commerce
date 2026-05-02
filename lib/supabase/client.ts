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
//
// V2-38 : uploadDocument a été remplacé par un flux signed upload URL en
// trois temps (POST /api/dossiers/[id]/documents/prepare-upload → PUT direct
// vers Storage via uploadToSignedUrl → POST /api/dossiers/[id]/documents/finalize-upload).
// `getSupabaseClient` reste exposé : il sert désormais uniquement à appeler
// `storage.uploadToSignedUrl(path, token, file)` côté browser, qui n'utilise
// pas la clé anon pour s'authentifier (le token signé suffit). La fermeture
// des policies anon documents / Storage est réservée à V2-38b.

/**
 * Type dérivé du retour réel de `createClient<Database>` (V2-31).
 * Évite l'incompatibilité avec `SupabaseClient<Database>` qui ne renseigne
 * qu'un seul des 4 paramètres génériques attendus depuis `@supabase/supabase-js@2.47`.
 */
type BrowserClient = ReturnType<typeof createClient<Database>>;

let browserClient: BrowserClient | null = null;

export function getSupabaseClient(): BrowserClient {
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
