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
