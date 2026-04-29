import { DOCUMENT_REQUIREMENTS, type Phase, type Priorite } from "./document-requirements";
import type { SituationDossier } from "./situation";

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

function idsForcesLeCasEcheant(situation: SituationDossier): Set<string> {
  const ids = new Set<string>();

  if (situation.salaries === false) {
    ids.add("contrats_travail");
    ids.add("bulletins_salaire");
  }

  if (situation.locaux_loues === false) {
    ids.add("bail_commercial");
    ids.add("accord_bailleur");
  }

  if (situation.marque_enseigne === false) {
    ids.add("actifs_incorporels");
  }

  if (situation.activite_reglementee === false) {
    ids.add("autorisations_administratives");
  }

  if (situation.acquereur_type === "physique") {
    ids.add("kbis_acquereur");
    ids.add("statuts_acquereur");
    ids.add("projet_statuts_acquereur");
  } else if (situation.acquereur_type === "societe_existante") {
    ids.add("identite_acquereur");
    ids.add("projet_statuts_acquereur");
  } else if (situation.acquereur_type === "societe_creation") {
    ids.add("kbis_acquereur");
    ids.add("statuts_acquereur");
    ids.add("identite_acquereur");
  }

  return ids;
}

export function analyserDocuments(
  docs: DocInfo[],
  situation?: SituationDossier
): ItemChecklist[] {
  const typesPrésents = new Set(
    docs
      .map((d) => d.type_document)
      .filter((t): t is string => Boolean(t) && t !== "autre")
  );

  const forcesCasEcheant = situation
    ? idsForcesLeCasEcheant(situation)
    : new Set<string>();

  const checklistRequirements: ItemChecklist[] = DOCUMENT_REQUIREMENTS.map((req) => {
    const présent = req.documentType ? typesPrésents.has(req.documentType) : false;

    const statut: Statut = présent
      ? "Présent"
      : forcesCasEcheant.has(req.id)
        ? "Le cas échéant"
        : statutAbsent(req.priorite);

    return {
      piece: req.label,
      statut,
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
