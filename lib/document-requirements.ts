export type Priorite =
  | "indispensable"
  | "conditionnel"
  | "recommande"
  | "le_cas_echeant";

export type Phase = "demarrage" | "audit_complet" | "avocat_acte";

export type Famille =
  | "vendeur"
  | "acquereur"
  | "fonds"
  | "comptable_financier"
  | "locatif"
  | "contrats"
  | "personnel"
  | "fiscal"
  | "acte_cession";

export type DocumentRequirement = {
  id: string;
  label: string;
  famille: Famille;
  priorite: Priorite;
  phase: Phase;
  documentType?: string;
  note?: string;
  conditionLabel?: string;
};

export const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  // ── Démarrage ────────────────────────────────────────────────────────────────
  {
    id: "kbis_vendeur",
    label: "Kbis ou extrait d'immatriculation du vendeur",
    famille: "vendeur",
    priorite: "indispensable",
    phase: "demarrage",
    documentType: "kbis",
    note: "Identité légale et immatriculation du cédant.",
  },
  {
    id: "bail_commercial",
    label: "Bail commercial en cours",
    famille: "locatif",
    priorite: "indispensable",
    phase: "demarrage",
    documentType: "bail_commercial",
    conditionLabel: "si locaux loués",
    note: "Vérifier impérativement la clause de cession et l'accord du bailleur.",
  },
  {
    id: "bilans",
    label: "Bilans et comptes annuels (3 derniers exercices)",
    famille: "comptable_financier",
    priorite: "indispensable",
    phase: "demarrage",
    documentType: "bilans_comptes_annuels",
    note: "Base de l'évaluation économique et financière du fonds.",
  },
  {
    id: "offre_achat",
    label: "Offre d'achat ou lettre d'intention",
    famille: "acte_cession",
    priorite: "le_cas_echeant",
    phase: "demarrage",
    conditionLabel: "si elle existe déjà",
    note: "Utile pour cadrer les négociations et anticiper les délais.",
  },

  // ── Audit complet ─────────────────────────────────────────────────────────────
  {
    id: "pieces_fiscales",
    label: "Pièces fiscales (liasses, IS, TVA)",
    famille: "fiscal",
    priorite: "indispensable",
    phase: "audit_complet",
    documentType: "pieces_fiscales",
    note: "Liasses fiscales et déclarations des 3 derniers exercices.",
  },
  {
    id: "statuts_vendeur",
    label: "Statuts de la société venderesse",
    famille: "vendeur",
    priorite: "recommande",
    phase: "audit_complet",
    documentType: "statuts",
    note: "Vérification des pouvoirs et de la capacité à céder.",
  },
  {
    id: "contrats_fournisseurs",
    label: "Contrats fournisseurs et de distribution",
    famille: "contrats",
    priorite: "recommande",
    phase: "audit_complet",
    documentType: "contrats_fournisseurs",
    note: "Contrats à reprendre, résilier ou renégocier lors de la cession.",
  },
  {
    id: "assurances",
    label: "Police d'assurance en cours",
    famille: "contrats",
    priorite: "recommande",
    phase: "audit_complet",
    note: "À transférer ou résilier à la date de cession.",
  },
  {
    id: "contrats_travail",
    label: "Contrats de travail en cours",
    famille: "personnel",
    priorite: "conditionnel",
    phase: "audit_complet",
    documentType: "contrat_travail",
    conditionLabel: "si salariés",
    note: "Transfert automatique des contrats — Art. L1224-1 du Code du travail.",
  },
  {
    id: "bulletins_salaire",
    label: "Bulletins de salaire récents (3 mois)",
    famille: "personnel",
    priorite: "conditionnel",
    phase: "audit_complet",
    documentType: "bulletin_salaire",
    conditionLabel: "si salariés",
    note: "Charges sociales, primes, avantages en nature.",
  },
  {
    id: "actifs_incorporels",
    label: "Titres de propriété incorporels (marque, enseigne, nom de domaine)",
    famille: "fonds",
    priorite: "conditionnel",
    phase: "audit_complet",
    documentType: "actifs_incorporels_marque",
    conditionLabel: "si marque ou enseigne déposée",
    note: "Dépôt INPI, droits sur l'enseigne, contrats de licence.",
  },
  {
    id: "autorisations_administratives",
    label: "Licences et autorisations administratives",
    famille: "fonds",
    priorite: "conditionnel",
    phase: "audit_complet",
    documentType: "autorisations_administratives",
    conditionLabel: "si activité réglementée",
    note: "Licence IV, débit de boissons, permis d'exploitation, agréments.",
  },

  // ── Avocat / acte ────────────────────────────────────────────────────────────
  {
    id: "accord_bailleur",
    label: "Accord formel du bailleur pour la cession du bail",
    famille: "locatif",
    priorite: "conditionnel",
    phase: "avocat_acte",
    conditionLabel: "si bail commercial",
    note: "Agrément obligatoire du bailleur avant toute cession du droit au bail.",
  },
  {
    id: "quittances_loyer",
    label: "Quittances de loyer (depuis la dernière révision)",
    famille: "locatif",
    priorite: "recommande",
    phase: "avocat_acte",
    note: "Preuve de paiement régulier — généralement 6 à 12 mois.",
  },
  {
    id: "etat_creances_dettes",
    label: "État des créances et dettes à la date de cession",
    famille: "comptable_financier",
    priorite: "recommande",
    phase: "avocat_acte",
    note: "Passif éventuel à déduire du prix ou à sécuriser contractuellement.",
  },
  {
    id: "inventaire_stocks",
    label: "Inventaire du matériel, mobilier et stocks",
    famille: "comptable_financier",
    priorite: "recommande",
    phase: "avocat_acte",
    note: "Valorisation contradictoire à la date de cession.",
  },
  {
    id: "contrats_credit_bail",
    label: "Contrats de crédit-bail et de location financière",
    famille: "contrats",
    priorite: "le_cas_echeant",
    phase: "avocat_acte",
    conditionLabel: "si matériel en crédit-bail",
    note: "Accord du bailleur financier requis — à solder ou transférer.",
  },
  {
    id: "kbis_acquereur",
    label: "Kbis de la société acquéreuse",
    famille: "acquereur",
    priorite: "conditionnel",
    phase: "avocat_acte",
    conditionLabel: "si société déjà créée",
    note: "Identification légale de l'acquéreur personne morale.",
  },
  {
    id: "statuts_acquereur",
    label: "Statuts de la société acquéreuse",
    famille: "acquereur",
    priorite: "conditionnel",
    phase: "avocat_acte",
    conditionLabel: "si société déjà créée",
    note: "Vérification des pouvoirs du représentant légal acquéreur.",
  },
  {
    id: "projet_statuts_acquereur",
    label: "Projet de statuts (société acquéreuse en cours de création)",
    famille: "acquereur",
    priorite: "le_cas_echeant",
    phase: "avocat_acte",
    conditionLabel: "si société en cours de création",
  },
  {
    id: "identite_acquereur",
    label: "Pièce d'identité de l'acquéreur",
    famille: "acquereur",
    priorite: "conditionnel",
    phase: "avocat_acte",
    conditionLabel: "si acquéreur personne physique",
    note: "Identité et état civil — nécessaire pour l'acte.",
  },
  {
    id: "financement_acquereur",
    label: "Justificatif de financement ou accord bancaire",
    famille: "acquereur",
    priorite: "recommande",
    phase: "avocat_acte",
    note: "Capacité financière et sécurisation de l'opération.",
  },
  {
    id: "contribution_economique",
    label: "Déclarations CET (1447-M, 1330-CVAE)",
    famille: "fiscal",
    priorite: "le_cas_echeant",
    phase: "avocat_acte",
    conditionLabel: "le cas échéant",
    note: "Contribution Économique Territoriale — à vérifier avec l'expert-comptable.",
  },
];
