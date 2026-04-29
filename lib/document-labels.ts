import type { DocumentType } from "./types";

const LABELS: Record<DocumentType | "non_detecte", string> = {
  bail_commercial: "Bail commercial",
  kbis: "Extrait Kbis",
  bilan: "Bilan",
  bilans_comptes_annuels: "Bilans / comptes annuels",
  liasse_fiscale: "Liasse fiscale",
  pieces_fiscales: "Pièces fiscales",
  contrat_travail: "Contrat de travail",
  bulletin_salaire: "Bulletin de salaire",
  actifs_incorporels_marque: "Actifs incorporels / marque",
  autorisations_administratives: "Autorisations administratives",
  contrats_fournisseurs: "Contrats fournisseurs",
  statuts: "Statuts",
  extrait_sirene: "Extrait Sirene",
  autre: "Autre",
  non_detecte: "Non détecté",
};

export function getDocumentLabel(type: string | null | undefined): string {
  if (!type) return LABELS.non_detecte;
  return LABELS[type as DocumentType] ?? LABELS.autre;
}
