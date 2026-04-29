export type AcquereurType =
  | "physique"
  | "societe_existante"
  | "societe_creation"
  | null;

export type SituationDossier = {
  salaries?: boolean | null;
  locaux_loues?: boolean | null;
  acquereur_type?: AcquereurType;
  marque_enseigne?: boolean | null;
  activite_reglementee?: boolean | null;
};
