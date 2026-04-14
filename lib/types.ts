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
  vendeur_nom?: string;
  vendeur_prenom?: string;
  vendeur_adresse?: string;
  vendeur_siret?: string;
  vendeur_telephone?: string;
  vendeur_email?: string;
  acheteur_nom?: string;
  acheteur_prenom?: string;
  acheteur_adresse?: string;
  acheteur_siret?: string;
  acheteur_telephone?: string;
  acheteur_email?: string;
  fonds_denomination?: string;
  fonds_activite?: string;
  fonds_adresse?: string;
  fonds_code_postal?: string;
  fonds_ville?: string;
  prix_cession?: number;
  date_entree_jouissance?: string;
  conditions_paiement?: string;
  chiffre_affaires_n1?: number;
  chiffre_affaires_n2?: number;
  chiffre_affaires_n3?: number;
  resultats_n1?: number;
  resultats_n2?: number;
  resultats_n3?: number;
  bail_bailleur?: string;
  bail_date_debut?: string;
  bail_date_expiration?: string;
  bail_loyer_mensuel?: number;
  bail_charges_mensuelles?: number;
  bail_duree_restante_mois?: number;
  elements_inclus?: string[];
  elements_exclus?: string[];
  confidence_scores?: Record<string, number>;
  ai_comments?: Record<string, string>;
  raw_ai_response?: string;
}

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

export interface ConfidenceLevel {
  value: number;
  label: "high" | "medium" | "low";
  color: "confidence-high" | "confidence-medium" | "confidence-low";
}

export interface AnalysisField {
  value: string | number | null;
  confidence: ConfidenceLevel;
  comment?: string;
  source?: string;
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
  raw_response: string;
}

export interface ContractData {
  cession_id: string;
  vendor: { fullname: string; address: string; siret?: string };
  buyer: { fullname: string; address: string; siret?: string };
  business: { name: string; activity: string; address: string };
  sale_price: number;
  handover_date: string;
  payment_terms: string;
  financials: {
    revenue_year1?: number;
    revenue_year2?: number;
    revenue_year3?: number;
  };
  lease: { landlord?: string; monthly_rent?: number; end_date?: string };
  included_elements: string[];
  excluded_elements: string[];
  generated_at: string;
}

export interface FormValidationError {
  field: string;
  message: string;
  type: "required" | "format" | "logic";
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: FormValidationError[];
  timestamp: string;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export interface AnalysisState {
  status: "idle" | "loading" | "success" | "error";
  progress?: number;
  error?: string;
  result?: AnalysisResult;
}
