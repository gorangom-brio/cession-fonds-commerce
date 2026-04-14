## 📁 `lib/supabase.ts`

```ts
/**
 * Client Supabase et utilitaires
 * À utiliser côté serveur uniquement (sauf pour le client créé avec la clé anon)
 */

import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

// Client côté serveur (avec service role key)
export const supabaseServer = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Client côté navigateur (avec clé anon - pour MVP sans auth)
export const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ============================================================================
   CESSIONS
   ============================================================================ */

export async function createCession() {
  const { data, error } = await supabaseServer
    .from("cessions")
    .insert({
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création cession: ${error.message}`);
  return data;
}

export async function getCession(id: string) {
  const { data, error } = await supabaseServer
    .from("cessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Erreur lecture cession: ${error.message}`);
  return data;
}

export async function updateCession(id: string, updates: Record<string, any>) {
  const { data, error } = await supabaseServer
    .from("cessions")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Erreur mise à jour cession: ${error.message}`);
  return data;
}

export async function updateCessionStatus(
  id: string,
  status: "draft" | "analysed" | "verified" | "contract_generated" | "sent_to_lawyer"
) {
  return updateCession(id, { status });
}

/* ============================================================================
   DOCUMENTS
   ============================================================================ */

export async function uploadDocument(
  cessionId: string,
  file: File,
  documentType?: string
) {
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const storagePath = `${cessionId}/${filename}`;

  // Upload vers Storage
  const { error: uploadError } = await supabaseServer.storage
    .from("documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erreur upload: ${uploadError.message}`);
  }

  // Créer l'enregistrement en BD
  const { data, error: dbError } = await supabaseServer
    .from("documents")
    .insert({
      cession_id: cessionId,
      nom_fichier: file.name,
      type_document: documentType,
      storage_path: storagePath,
      taille_octets: file.size,
      analyse_effectuee: false,
    })
    .select()
    .single();

  if (dbError) {
    throw new Error(`Erreur enregistrement: ${dbError.message}`);
  }

  return data;
}

export async function getDocuments(cessionId: string) {
  const { data, error } = await supabaseServer
    .from("documents")
    .select("*")
    .eq("cession_id", cessionId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erreur lecture documents: ${error.message}`);
  return data;
}

export async function getDocumentUrl(storagePath: string) {
  const { data } = supabaseServer.storage
    .from("documents")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export async function downloadDocument(storagePath: string) {
  const { data, error } = await supabaseServer.storage
    .from("documents")
    .download(storagePath);

  if (error) throw new Error(`Erreur téléchargement: ${error.message}`);
  return data;
}

export async function deleteDocument(documentId: string, storagePath: string) {
  // Supprimer de Storage
  const { error: storageError } = await supabaseServer.storage
    .from("documents")
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Erreur suppression fichier: ${storageError.message}`);
  }

  // Supprimer de la BD
  const { error: dbError } = await supabaseServer
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (dbError) {
    throw new Error(`Erreur suppression enregistrement: ${dbError.message}`);
  }
}

export async function markDocumentAnalysed(documentId: string) {
  const { error } = await supabaseServer
    .from("documents")
    .update({ analyse_effectuee: true })
    .eq("id", documentId);

  if (error) {
    throw new Error(`Erreur marquage analyse: ${error.message}`);
  }
}

/* ============================================================================
   UTILITAIRES
   ============================================================================ */

export async function deleteCession(id: string) {
  // Supprimer tous les documents du bucket
  const documents = await getDocuments(id);
  if (documents && documents.length > 0) {
    const paths = documents.map((d) => d.storage_path);
    await supabaseServer.storage.from("documents").remove(paths);
  }

  // Supprimer la cession
  const { error } = await supabaseServer
    .from("cessions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Erreur suppression: ${error.message}`);
}

export async function cleanupOldSessions(daysOld: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data: oldSessions, error: queryError } = await supabaseServer
    .from("cessions")
    .select("id")
    .lt("created_at", cutoffDate.toISOString())
    .eq("status", "draft");

  if (queryError) throw new Error(`Erreur requête: ${queryError.message}`);

  if (oldSessions && oldSessions.length > 0) {
    for (const session of oldSessions) {
      await deleteCession(session.id);
    }
  }

  return oldSessions?.length || 0;
}
```

---

**`lib/supabase.ts` généré.** Crée ce fichier dans le dossier `lib/`.

⚠️ **Note importante** : Tu auras besoin de créer le fichier `lib/database.types.ts` (types TypeScript générés par Supabase). Pour le MVP, il peut être minimaliste :

---

## 📁 `lib/database.types.ts`

```ts
/**
 * Types générés par Supabase (à générer depuis le dashboard Supabase)
 * Pour le MVP, on les génère manuellement ici
 */

export interface Database {
  public: {
    Tables: {
      cessions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          status: "draft" | "analysed" | "verified" | "contract_generated" | "sent_to_lawyer";
          vendeur_nom: string | null;
          vendeur_prenom: string | null;
          vendeur_adresse: string | null;
          vendeur_siret: string | null;
          acheteur_nom: string | null;
          acheteur_prenom: string | null;
          acheteur_adresse: string | null;
          acheteur_siret: string | null;
          fonds_denomination: string | null;
          fonds_activite: string | null;
          fonds_adresse: string | null;
          prix_cession: number | null;
          date_entree_jouissance: string | null;
          chiffre_affaires_n1: number | null;
          chiffre_affaires_n2: number | null;
          chiffre_affaires_n3: number | null;
          bail_bailleur: string | null;
          bail_date_expiration: string | null;
          bail_loyer_mensuel: number | null;
          elements_inclus: string[] | null;
          elements_exclus: string[] | null;
          confidence_scores: Record<string, number> | null;
          ai_comments: Record<string, string> | null;
          raw_ai_response: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["cessions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["cessions"]["Insert"]>;
      };
      documents: {
        Row: {
          id: string;
          created_at: string;
          cession_id: string;
          nom_fichier: string;
          type_document: string | null;
          storage_path: string;
          taille_octets: number;
          analyse_effectuee: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["documents"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
```

---

**`lib/database.types.ts` généré.** Crée ce fichier dans le dossier `lib/`.

**Prêt pour le fichier suivant** → `lib/prompt-maitre.ts` (le Prompt Maître v3.0 pour l'analyse IA)

Réponds **"suivant"** pour continuer.
