/**
 * Types centralisés du projet Cession Fonds Commerce
 */

/* ============================================================================
   CESSION (Session/Dossier)
   ============================================================================ */

export type CessionStatus =
  | "draft"
  | "analysed"
  | "verified"
  | "contract_generated"
  | "sent_to_lawyer";

export interface Cession {
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  status: CessionStatus;

  // Vendeur
  vendeur_nom?: string;
  vendeur_prenom?: string;
  vendeur_adresse?: string;
  vendeur_siret?: string;
  vendeur_telephone?: string;
  vendeur_email?: string;

  // Acheteur
  acheteur_nom?: string;
  acheteur_prenom?: string;
  acheteur_adresse?: string;
  acheteur_siret?: string;
  acheteur_telephone?: string;
  acheteur_email?: string;

  // Fonds de commerce
  fonds_denomination?: string;
  fonds_activite?: string;
  fonds_adresse?: string;
  fonds_code_postal?: string;
  fonds_ville?: string;

  // Conditions commerciales
  prix_cession?: number;
  date_entree_jouissance?: string; // ISO date
  conditions_paiement?: string;

  // Finances
  chiffre_affaires_n1?: number;
  chiffre_affaires_n2?: number;
  chiffre_affaires_n3?: number;
  resultats_n1?: number;
  resultats_n2?: number;
  resultats_n3?: number;

  // Bail
  bail_bailleur?: string;
  bail_date_debut?: string;
  bail_date_expiration?: string;
  bail_loyer_mensuel?: number;
  bail_charges_mensuelles?: number;
  bail_duree_restante_mois?: number;

  // Éléments inclus/exclus
  elements_inclus?: string[];
  elements_exclus?: string[];

  // Métadonnées IA
  confidence_scores?: Record<string, number>;
  ai_comments?: Record<string, string>;
  raw_ai_response?: string;
}

/* ============================================================================
   DOCUMENTS
   ============================================================================ */

export type DocumentType =
  | "kbis"
  | "bail_commercial"
  | "bilan"
  | "statuts"
  | "extrait_sirene"
  | "liasse_fiscale"
  | "autre";

export interface Document {
  id: string;
  created_at: string;
  cession_id: string;
  nom_fichier: string;
  type_document?: DocumentType;
  storage_path: string;
  taille_octets: number;
  analyse_effectuee: boolean;
}

/* ============================================================================
   RÉSULTATS D'ANALYSE IA
   ============================================================================ */

export interface ConfidenceLevel {
  value: number; // 0-1
  label: "high" | "medium" | "low"; // vert, orange, rouge
  color: "confidence-high" | "confidence-medium" | "confidence-low";
}

export interface AnalysisField {
  value: string | number | null;
  confidence: ConfidenceLevel;
  comment?: string; // Explication de l'IA
  source?: string; // D'où ça vient dans les PDFs
}

export interface AnalysisResult {
  cession_id: string;
  timestamp: string;
  vendor: {
    name?: AnalysisField;
    firstname?: AnalysisField;
    address?: AnalysisField;
    siret?: AnalysisField;
    email?: AnalysisField;
    phone?: AnalysisField;
  };
  buyer: {
    name?: AnalysisField;
    firstname?: AnalysisField;
    address?: AnalysisField;
    siret?: AnalysisField;
    email?: AnalysisField;
    phone?: AnalysisField;
  };
  business: {
    name?: AnalysisField;
    activity?: AnalysisField;
    address?: AnalysisField;
    postal_code?: AnalysisField;
    city?: AnalysisField;
  };
  financials: {
    sale_price?: AnalysisField;
    revenue_year1?: AnalysisField;
    revenue_year2?: AnalysisField;
    revenue_year3?: AnalysisField;
  };
  lease: {
    landlord?: AnalysisField;
    end_date?: AnalysisField;
    monthly_rent?: AnalysisField;
    monthly_charges?: AnalysisField;
  };
  handover_date?: AnalysisField;
  payment_terms?: AnalysisField;
  included_elements?: AnalysisField;
  excluded_elements?: AnalysisField;
  raw_response: string; // Réponse brute de Claude pour debug
}

/* ============================================================================
   CONTRAT PDF
   ============================================================================ */

export interface ContractData {
  cession_id: string;
  vendor: {
    fullname: string;
    address: string;
    siret?: string;
  };
  buyer: {
    fullname: string;
    address: string;
    siret?: string;
  };
  business: {
    name: string;
    activity: string;
    address: string;
  };
  sale_price: number;
  handover_date: string;
  payment_terms: string;
  financials: {
    revenue_year1?: number;
    revenue_year2?: number;
    revenue_year3?: number;
  };
  lease: {
    landlord?: string;
    monthly_rent?: number;
    end_date?: string;
  };
  included_elements: string[];
  excluded_elements: string[];
  generated_at: string;
}

/* ============================================================================
   VALIDATION FORMULAIRE
   ============================================================================ */

export interface FormValidationError {
  field: string;
  message: string;
  type: "required" | "format" | "logic";
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
}

/* ============================================================================
   API RESPONSES
   ============================================================================ */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: FormValidationError[];
  timestamp: string;
}

export interface AnalyseApiRequest {
  documents: {
    id: string;
    content: string; // Texte extrait du PDF
    filename: string;
  }[];
  cession_id: string;
}

export interface GenerateContractApiRequest {
  cession_id: string;
  vendor_name: string;
  vendor_firstname: string;
  vendor_address: string;
  buyer_name: string;
  buyer_firstname: string;
  buyer_address: string;
  business_name: string;
  business_activity: string;
  business_address: string;
  sale_price: number;
  handover_date: string;
  payment_terms: string;
  included_elements: string[];
  excluded_elements: string[];
}

export interface SendToLawyerApiRequest {
  cession_id: string;
  lawyer_email: string;
  vendor_email: string;
  message?: string;
}

/* ============================================================================
   UI STATE
   ============================================================================ */

export interface UploadProgress {
  filename: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export interface AnalysisState {
  status: "idle" | "loading" | "success" | "error";
  progress?: number;
  error?: string;
  result?: AnalysisResult;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}
