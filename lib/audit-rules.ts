import { DOCUMENT_REQUIREMENTS, type Phase, type Priorite } from "./document-requirements";

export type { Phase };

export type Statut = "Présent" | "À vérifier" | "Manquant" | "Le cas échéant";

export type ItemChecklist = {
  piece: string;
  statut: Statut;
  note?: string;
  phase?: Phase;
  priorite?: Priorite;
  conditionLabel?: string;
};

type DocInfo = {
  type_document: string | null;
  nom_fichier: string;
};

function statutAbsent(priorite: Priorite): Statut {
  switch (priorite) {
    case "indispensable":
      return "Manquant";
    case "conditionnel":
    case "recommande":
      return "À vérifier";
    case "le_cas_echeant":
      return "Le cas échéant";
  }
}

export function analyserDocuments(docs: DocInfo[]): ItemChecklist[] {
  const typesPrésents = new Set(
    docs
      .map((d) => d.type_document)
      .filter((t): t is string => Boolean(t) && t !== "autre")
  );

  const checklistRequirements: ItemChecklist[] = DOCUMENT_REQUIREMENTS.map((req) => {
    const présent = req.documentType ? typesPrésents.has(req.documentType) : false;
    return {
      piece: req.label,
      statut: présent ? "Présent" : statutAbsent(req.priorite),
      note: req.note,
      phase: req.phase,
      priorite: req.priorite,
      conditionLabel: req.conditionLabel,
    };
  });

  const nonClasses: ItemChecklist[] = docs
    .filter((d) => !d.type_document || d.type_document === "autre")
    .map((doc) => ({
      piece: doc.nom_fichier,
      statut: "À vérifier" as Statut,
      note: "Type non détecté automatiquement — à identifier manuellement.",
    }));

  return [...checklistRequirements, ...nonClasses];
}
