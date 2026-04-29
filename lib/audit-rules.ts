import { getDocumentLabel } from "./document-labels";

export type Statut = "Présent" | "À vérifier" | "Manquant";

export type ItemChecklist = {
  piece: string;
  statut: Statut;
  note?: string;
};

type DocInfo = {
  type_document: string | null;
  nom_fichier: string;
};

const CATEGORIES_ATTENDUES = [
  "bail_commercial",
  "kbis",
  "bilans_comptes_annuels",
  "pieces_fiscales",
  "contrat_travail",
  "bulletin_salaire",
  "actifs_incorporels_marque",
  "autorisations_administratives",
  "contrats_fournisseurs",
] as const;

export function analyserDocuments(docs: DocInfo[]): ItemChecklist[] {
  const typesPrésents = new Set(
    docs
      .map((d) => d.type_document)
      .filter((t): t is string => Boolean(t) && t !== "autre")
  );

  const categoriesChecklist: ItemChecklist[] = CATEGORIES_ATTENDUES.map((type) => ({
    piece: getDocumentLabel(type),
    statut: typesPrésents.has(type) ? "Présent" : "Manquant",
  }));

  const nonClasses: ItemChecklist[] = docs
    .filter((d) => !d.type_document || d.type_document === "autre")
    .map((doc) => ({
      piece: doc.nom_fichier,
      statut: "À vérifier" as Statut,
      note: "Type non détecté automatiquement — à identifier manuellement.",
    }));

  return [...categoriesChecklist, ...nonClasses];
}
