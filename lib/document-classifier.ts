import type { DocumentType } from "./types";

const PATTERNS: Array<{ type: DocumentType; keywords: string[] }> = [
  {
    type: "bail_commercial",
    keywords: ["bail", "bail commercial", "droit au bail"],
  },
  {
    type: "kbis",
    keywords: ["kbis", "extrait kbis", "rcs", "registre commerce"],
  },
  {
    type: "bilans_comptes_annuels",
    keywords: ["bilan", "comptes annuels", "compte annuel", "liasse comptable"],
  },
  {
    type: "pieces_fiscales",
    keywords: ["liasse fiscale", "fiscal", "tva", "impôt", "impot", "declaration"],
  },
  {
    type: "contrat_travail",
    keywords: ["contrat travail", "contrat de travail", "cdi", "cdd"],
  },
  {
    type: "bulletin_salaire",
    keywords: ["bulletin", "salaire", "paie", "fiche de paie", "fiche paie"],
  },
  {
    type: "actifs_incorporels_marque",
    keywords: ["marque", "inpi", "enseigne", "nom commercial", "logo"],
  },
  {
    type: "autorisations_administratives",
    keywords: ["autorisation", "licence", "permis", "agrement", "agrément"],
  },
  {
    type: "contrats_fournisseurs",
    keywords: ["fournisseur", "contrat fournisseur", "contrat prestataire", "prestataire"],
  },
];

export function classifierDocument(nomFichier: string): DocumentType {
  const base = nomFichier
    .toLowerCase()
    .replace(/\.[^.]+$/, "")   // retirer l'extension
    .replace(/[-_]/g, " ");    // normaliser séparateurs

  for (const { type, keywords } of PATTERNS) {
    if (keywords.some((kw) => base.includes(kw))) {
      return type;
    }
  }

  return "autre";
}
