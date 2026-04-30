export type NiveauConfiance = "haute" | "moyenne" | "faible" | "non_extractible";

export type ChampExtrait<T = string> = {
  valeur: T | null;
  confiance: NiveauConfiance;
  source?: string;
};

export type ExtractionKbis = {
  type: "kbis";
  denomination: ChampExtrait;
  forme_juridique: ChampExtrait;
  capital_social: ChampExtrait<number>;
  siren: ChampExtrait;
  adresse_siege: ChampExtrait;
  dirigeant: ChampExtrait;
  activite: ChampExtrait;
  date_immatriculation: ChampExtrait;
};

export type ExtractionBilan = {
  type: "bilans_comptes_annuels";
  exercice: ChampExtrait<number>;
  chiffre_affaires: ChampExtrait<number>;
  resultat_net: ChampExtrait<number>;
  capitaux_propres: ChampExtrait<number>;
};

export type ExtractionBail = {
  type: "bail_commercial";
  bailleur: ChampExtrait;
  preneur: ChampExtrait;
  adresse_locaux: ChampExtrait;
  date_debut: ChampExtrait;
  duree_annees: ChampExtrait<number>;
  loyer_annuel: ChampExtrait<number>;
  depot_garantie: ChampExtrait<number>;
  clause_cession_presente: ChampExtrait<boolean>;
  destination_locaux: ChampExtrait;
};

export type ExtractionNonDisponible = {
  type: string;
  non_extractible: true;
  raison: "pdf_scanne" | "type_non_supporte" | "texte_insuffisant";
};

export type ExtractionResultat =
  | ExtractionKbis
  | ExtractionBilan
  | ExtractionBail
  | ExtractionNonDisponible;

export type DocumentExtrait = {
  id: string;
  nom_fichier: string;
  type_document: string | null;
  extraction: ExtractionResultat;
};

export type StructuredExtractionResponse = {
  cession_id: string;
  documents: DocumentExtrait[];
};
