import Link from "next/link";
import DossierStepper from "./DossierStepper";
import type { SituationDossier } from "@/lib/situation";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QUESTION_KEYS = [
  "salaries",
  "locaux_loues",
  "acquereur_type",
  "marque_enseigne",
  "activite_reglementee",
] as const;
const NB_QUESTIONS = QUESTION_KEYS.length;

type DossierDashboardPageProps = {
  params: Promise<{ id: string }>;
};

type DocumentMinimal = {
  nom_fichier: string;
  type_document: string | null;
  analyse_effectuee: boolean;
  nb_caracteres_extraits: number | null;
  extraction_ok: boolean | null;
};

type Compteurs = {
  totalDocs: number;
  classifies: number;
  aVerifier: number;
  totalPdfs: number;
  pdfsExploitables: number;
  pdfsScannes: number;
  pdfsEnAttente: number;
  reponsesRenseignees: number;
  questionnaireRempli: boolean;
  auditCommence: boolean;
};

const COMPTEURS_VIDES: Compteurs = {
  totalDocs: 0,
  classifies: 0,
  aVerifier: 0,
  totalPdfs: 0,
  pdfsExploitables: 0,
  pdfsScannes: 0,
  pdfsEnAttente: 0,
  reponsesRenseignees: 0,
  questionnaireRempli: false,
  auditCommence: false,
};

function calculerCompteurs(
  documents: DocumentMinimal[],
  situation: SituationDossier,
): Compteurs {
  const totalDocs = documents.length;
  const classifies = documents.filter(
    (d) => d.type_document && d.type_document !== "autre",
  ).length;
  const aVerifier = totalDocs - classifies;

  const pdfs = documents.filter((d) =>
    d.nom_fichier.toLowerCase().endsWith(".pdf"),
  );
  const pdfsExploitables = pdfs.filter(
    (d) => d.extraction_ok === true && (d.nb_caracteres_extraits ?? 0) > 0,
  ).length;
  const pdfsScannes = pdfs.filter(
    (d) => d.extraction_ok === true && (d.nb_caracteres_extraits ?? 0) === 0,
  ).length;
  const pdfsEnAttente = pdfs.filter((d) => !d.analyse_effectuee).length;

  const reponsesRenseignees = QUESTION_KEYS.filter((k) => {
    const v = situation[k];
    return v !== null && v !== undefined;
  }).length;

  return {
    totalDocs,
    classifies,
    aVerifier,
    totalPdfs: pdfs.length,
    pdfsExploitables,
    pdfsScannes,
    pdfsEnAttente,
    reponsesRenseignees,
    questionnaireRempli: reponsesRenseignees > 0,
    auditCommence: pdfs.some((d) => d.analyse_effectuee),
  };
}

type Action = { texte: string; href: string };

function calculerActions(
  id: string,
  c: Compteurs,
  validationDejaDemandee: boolean,
): Action[] {
  const actions: Action[] = [];

  if (c.totalDocs === 0) {
    actions.push({
      texte: "Déposer les premiers documents",
      href: `/dossiers/${id}/documents`,
    });
  } else {
    if (c.aVerifier > 0) {
      actions.push({
        texte: "Vérifier les documents non classifiés",
        href: `/dossiers/${id}/documents`,
      });
    }
    if (c.pdfsEnAttente > 0) {
      actions.push({
        texte: "Lancer l'extraction texte des PDF depuis la page audit",
        href: `/dossiers/${id}/audit`,
      });
    }
    if (!c.questionnaireRempli) {
      actions.push({
        texte: "Compléter le questionnaire de situation",
        href: `/dossiers/${id}/audit`,
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      texte: "Consulter et imprimer le rapport préparatoire",
      href: `/dossiers/${id}/rapport`,
    });
    if (!validationDejaDemandee) {
      actions.push({
        texte: "Préparer la transmission à un professionnel",
        href: `/dossiers/${id}/validation-avocat`,
      });
    }
  }

  return actions.slice(0, 3);
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default async function DossierDashboardPage({
  params,
}: DossierDashboardPageProps) {
  const { id } = await params;
  const modeReel = IS_UUID.test(id);

  let compteurs: Compteurs = COMPTEURS_VIDES;
  let dateCreation: string | null = null;
  let validationDate: string | null = null;
  let erreurSupabase = false;

  if (modeReel) {
    try {
      const {
        getCessionById,
        getDocumentsByCessionId,
        getLastValidationRequestDate,
      } = await import("@/lib/supabase/server");
      const [cession, docs, lastValidation] = await Promise.all([
        getCessionById(id),
        getDocumentsByCessionId(id),
        getLastValidationRequestDate(id),
      ]);
      const situation: SituationDossier =
        cession.situation_declaree &&
        typeof cession.situation_declaree === "object" &&
        !Array.isArray(cession.situation_declaree)
          ? (cession.situation_declaree as SituationDossier)
          : {};
      compteurs = calculerCompteurs(docs, situation);
      dateCreation = cession.created_at;
      validationDate = lastValidation;
    } catch {
      erreurSupabase = true;
    }
  }

  const actions = calculerActions(id, compteurs, validationDate !== null);

  const liens = [
    {
      href: `/dossiers/${id}/documents`,
      title: "Documents",
      description: "Déposer et organiser les pièces du dossier.",
    },
    {
      href: `/dossiers/${id}/audit`,
      title: "Audit",
      description: "Lancer l'audit et consulter les premiers signaux.",
    },
    {
      href: `/dossiers/${id}/rapport`,
      title: "Rapport",
      description: "Lire la synthèse, les manques et les recommandations.",
    },
    {
      href: `/dossiers/${id}/validation-avocat`,
      title: "Validation avocat",
      description: "Préparer la transmission du dossier à un professionnel.",
    },
  ];

  let phraseIntro: string;
  if (modeReel && !erreurSupabase) {
    phraseIntro = dateCreation
      ? `Dossier créé le ${formatDate(dateCreation)}. Vue d'ensemble des pièces déposées et de l'avancement de l'audit.`
      : "Vue d'ensemble des pièces déposées et de l'avancement de l'audit.";
  } else if (modeReel && erreurSupabase) {
    phraseIntro =
      "Les données du dossier n'ont pas pu être récupérées pour le moment. Le tableau de bord s'affichera complètement une fois la connexion rétablie.";
  } else {
    phraseIntro =
      "Mode démo — aucun dossier réel n'est associé à cette page. Les compteurs ci-dessous sont vides.";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DossierStepper id={id} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
        <h1 className="text-4xl font-bold text-navy-900">
          Tableau de bord du dossier
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">{phraseIntro}</p>
      </div>

      {/* 4 cartes de synthèse */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Documents */}
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Documents
          </p>
          <p className="text-2xl font-bold text-navy-900">
            {compteurs.totalDocs}
          </p>
          <p className="text-sm text-muted-foreground">
            {compteurs.totalDocs === 0
              ? "Aucun document déposé pour le moment."
              : `${compteurs.classifies} classifié${compteurs.classifies > 1 ? "s" : ""} · ${compteurs.aVerifier} à vérifier`}
          </p>
        </div>

        {/* PDF */}
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            PDF
          </p>
          <p className="text-2xl font-bold text-navy-900">
            {compteurs.pdfsExploitables}
          </p>
          <p className="text-sm text-muted-foreground">
            {compteurs.totalPdfs === 0
              ? "Aucun PDF déposé."
              : `${compteurs.pdfsExploitables} exploitable${compteurs.pdfsExploitables > 1 ? "s" : ""} · ${compteurs.pdfsScannes} non lisible${compteurs.pdfsScannes > 1 ? "s" : ""} · ${compteurs.pdfsEnAttente} en attente d'extraction`}
          </p>
        </div>

        {/* Questionnaire */}
        <div className="rounded-lg border border-border bg-white p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Questionnaire
          </p>
          <p className="text-2xl font-bold text-navy-900">
            {compteurs.reponsesRenseignees}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {NB_QUESTIONS}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {compteurs.questionnaireRempli
              ? `Rempli (${compteurs.reponsesRenseignees}/${NB_QUESTIONS})`
              : "Non rempli"}
          </p>
        </div>

        {/* Avancement */}
        <div className="rounded-lg border border-border bg-white p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">
            Avancement
          </p>
          <ul className="space-y-1 text-sm text-navy-900">
            <li>
              Documents :{" "}
              <span className="font-medium text-muted-foreground">
                {compteurs.totalDocs > 0 ? "déposés" : "non encore déposés"}
              </span>
            </li>
            <li>
              Audit :{" "}
              <span className="font-medium text-muted-foreground">
                {compteurs.auditCommence ? "commencé" : "non encore lancé"}
              </span>
            </li>
            <li>
              Rapport :{" "}
              <span className="font-medium text-muted-foreground">
                consultable
              </span>
            </li>
            <li>
              Validation avocat :{" "}
              <span className="font-medium text-muted-foreground">
                {validationDate
                  ? `demandée le ${formatDate(validationDate)}`
                  : "non demandée"}
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Prochaines actions */}
      <section className="rounded-lg border border-border bg-gray-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Prochaines actions
        </h2>
        <ol className="space-y-2 text-sm">
          {actions.map((action, index) => (
            <li key={action.href + action.texte}>
              <Link
                href={action.href}
                className="inline-flex items-start gap-2 text-navy-700 hover:text-navy-900 hover:underline transition-colors"
              >
                <span className="font-bold shrink-0">{index + 1}.</span>
                <span>{action.texte}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* 4 cartes de navigation */}
      <section className="grid gap-4 md:grid-cols-2">
        {liens.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-lg border border-border bg-white p-6 transition-colors hover:border-navy-700 cursor-pointer"
          >
            <p className="text-lg font-semibold text-navy-900">{link.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {link.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
