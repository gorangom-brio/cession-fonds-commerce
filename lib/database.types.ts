export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cessions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          status:
            | "draft"
            | "analysed"
            | "verified"
            | "contract_generated"
            | "sent_to_lawyer";
          vendeur_nom: string | null;
          vendeur_prenom: string | null;
          vendeur_adresse: string | null;
          vendeur_siret: string | null;
          vendeur_telephone: string | null;
          vendeur_email: string | null;
          acheteur_nom: string | null;
          acheteur_prenom: string | null;
          acheteur_adresse: string | null;
          acheteur_siret: string | null;
          acheteur_telephone: string | null;
          acheteur_email: string | null;
          fonds_denomination: string | null;
          fonds_activite: string | null;
          fonds_adresse: string | null;
          fonds_code_postal: string | null;
          fonds_ville: string | null;
          prix_cession: number | null;
          date_entree_jouissance: string | null;
          conditions_paiement: string | null;
          chiffre_affaires_n1: number | null;
          chiffre_affaires_n2: number | null;
          chiffre_affaires_n3: number | null;
          resultats_n1: number | null;
          resultats_n2: number | null;
          resultats_n3: number | null;
          bail_bailleur: string | null;
          bail_date_debut: string | null;
          bail_date_expiration: string | null;
          bail_loyer_mensuel: number | null;
          bail_charges_mensuelles: number | null;
          bail_duree_restante_mois: number | null;
          elements_inclus: string[] | null;
          elements_exclus: string[] | null;
          confidence_scores: Json | null;
          ai_comments: Json | null;
          raw_ai_response: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          status?:
            | "draft"
            | "analysed"
            | "verified"
            | "contract_generated"
            | "sent_to_lawyer";
          vendeur_nom?: string | null;
          vendeur_prenom?: string | null;
          vendeur_adresse?: string | null;
          vendeur_siret?: string | null;
          vendeur_telephone?: string | null;
          vendeur_email?: string | null;
          acheteur_nom?: string | null;
          acheteur_prenom?: string | null;
          acheteur_adresse?: string | null;
          acheteur_siret?: string | null;
          acheteur_telephone?: string | null;
          acheteur_email?: string | null;
          fonds_denomination?: string | null;
          fonds_activite?: string | null;
          fonds_adresse?: string | null;
          fonds_code_postal?: string | null;
          fonds_ville?: string | null;
          prix_cession?: number | null;
          date_entree_jouissance?: string | null;
          conditions_paiement?: string | null;
          chiffre_affaires_n1?: number | null;
          chiffre_affaires_n2?: number | null;
          chiffre_affaires_n3?: number | null;
          resultats_n1?: number | null;
          resultats_n2?: number | null;
          resultats_n3?: number | null;
          bail_bailleur?: string | null;
          bail_date_debut?: string | null;
          bail_date_expiration?: string | null;
          bail_loyer_mensuel?: number | null;
          bail_charges_mensuelles?: number | null;
          bail_duree_restante_mois?: number | null;
          elements_inclus?: string[] | null;
          elements_exclus?: string[] | null;
          confidence_scores?: Json | null;
          ai_comments?: Json | null;
          raw_ai_response?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          status?:
            | "draft"
            | "analysed"
            | "verified"
            | "contract_generated"
            | "sent_to_lawyer";
          vendeur_nom?: string | null;
          vendeur_prenom?: string | null;
          vendeur_adresse?: string | null;
          vendeur_siret?: string | null;
          vendeur_telephone?: string | null;
          vendeur_email?: string | null;
          acheteur_nom?: string | null;
          acheteur_prenom?: string | null;
          acheteur_adresse?: string | null;
          acheteur_siret?: string | null;
          acheteur_telephone?: string | null;
          acheteur_email?: string | null;
          fonds_denomination?: string | null;
          fonds_activite?: string | null;
          fonds_adresse?: string | null;
          fonds_code_postal?: string | null;
          fonds_ville?: string | null;
          prix_cession?: number | null;
          date_entree_jouissance?: string | null;
          conditions_paiement?: string | null;
          chiffre_affaires_n1?: number | null;
          chiffre_affaires_n2?: number | null;
          chiffre_affaires_n3?: number | null;
          resultats_n1?: number | null;
          resultats_n2?: number | null;
          resultats_n3?: number | null;
          bail_bailleur?: string | null;
          bail_date_debut?: string | null;
          bail_date_expiration?: string | null;
          bail_loyer_mensuel?: number | null;
          bail_charges_mensuelles?: number | null;
          bail_duree_restante_mois?: number | null;
          elements_inclus?: string[] | null;
          elements_exclus?: string[] | null;
          confidence_scores?: Json | null;
          ai_comments?: Json | null;
          raw_ai_response?: string | null;
        };
        Relationships: [];
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
        Insert: {
          id?: string;
          created_at?: string;
          cession_id: string;
          nom_fichier: string;
          type_document?: string | null;
          storage_path: string;
          taille_octets: number;
          analyse_effectuee?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          cession_id?: string;
          nom_fichier?: string;
          type_document?: string | null;
          storage_path?: string;
          taille_octets?: number;
          analyse_effectuee?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "documents_cession_id_fkey";
            columns: ["cession_id"];
            isOneToOne: false;
            referencedRelation: "cessions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
