import Link from "next/link";
import { getDocumentLabel } from "@/lib/document-labels";
import { type Statut, type ItemChecklist, type Phase, analyserDocuments } from "@/lib/audit-rules";
import DossierStepper from "../DossierStepper";
import PdfExtractionPanel from "./PdfExtractionPanel";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DossierAuditPageProps = {
  params: Promise<{ id: string }>;
};

const PHASES: Phase[] = ["demarrage", "audit_complet", "avocat_acte"];

const PHASE_LABELS: Record<Phase, string> = {
  demarrage: "Phase 1 — Démarrage",
  audit_complet: "Phase 2 — Audit complet",
  avocat_acte: "Phase 3 — Avocat & acte",
};

const pointsAttention = [
  "Vérifier la clause de cession du bail : accord du bailleur requis avant toute cession.",
  "Vérifier la cohérence du prix avec les éléments comptables : chiffre d'affaires, résultats, valorisation du fonds.",
  "Vérifier les salariés transférés : liste nominative, ancienneté, conditions de reprise.",
  "Vérifier les actifs incorporels inclus ou exclus de la cession : marque, enseigne, nom commercial, clientèle.",
];

const STATUT_STYLE: Record<Statut, string> = {
  Présent: "confidenceGreen",
  "À vérifier": "confidenceOrange",
  Manquant: "confidenceRed",
  "Le cas échéant": "bg-gray-100 text-gray-500",
};

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default async function DossierAuditPage({
  params,
}: DossierAuditPageProps) {
  const { id } = await params;
  const modeReel = IS_UUID.test(id);

  type DocumentReel = {
    id: string;
    nom_fichier: string;
    taille_octets: number;
    type_document: string | null;
    analyse_effectuee: boolean;
  };

  let documentsReels: DocumentReel[] = [];
  let erreurSupabase = false;

  if (modeReel) {
    try {
      const { getDocumentsByCessionId } = await import(
        "@/lib/supabase/server"
      );
      documentsReels = await getDocumentsByCessionId(id);
    } catch {
      erreurSupabase = true;
    }
  }

  const checklistEffective: ItemChecklist[] =
    modeReel && !erreurSupabase
      ? analyserDocuments(documentsReels)
      : analyserDocuments([]);

  const presents = checklistEffective.filter((i) => i.statut === "Présent").length;
  const aVerifier = checklistEffective.filter((i) => i.statut === "À vérifier").length;
  const manquants = checklistEffective.filter((i) => i.statut === "Manquant").length;
  const leCasEcheant = checklistEffective.filter((i) => i.statut === "Le cas échéant").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DossierStepper id={id} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
        <h1 className="text-4xl font-bold text-navy-900">
          Audit documentaire du dossier
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          {modeReel && !erreurSupabase
            ? "Checklist calculée à partir des documents réellement téléversés. Les statuts reflètent les types détectés — pas le contenu des documents."
            : "Mode démo — aucun document réel. La checklist indique les pièces attendues pour une cession de fonds de commerce standard."}
        </p>
      </div>

      {/* Section documents réels — UUID uniquement */}
      {modeReel && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-navy-900">
            Pièces réellement déposées
          </h2>

          {erreurSupabase && (
            <p className="text-sm text-muted-foreground italic">
              Mode démo : les documents réels n&apos;ont pas pu être récupérés.
            </p>
          )}

          {!erreurSupabase && documentsReels.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun document téléversé n&apos;a encore été trouvé pour ce dossier.
            </p>
          )}

          {!erreurSupabase && documentsReels.length > 0 && (
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Fichier
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                      Taille
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                      Type détecté
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Analysé
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documentsReels.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-5 py-4 font-medium text-navy-900 max-w-xs truncate">
                        {doc.nom_fichier}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">
                        {formatTaille(doc.taille_octets)}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {doc.type_document ? (
                          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200">
                            {getDocumentLabel(doc.type_document)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Non détecté
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {doc.analyse_effectuee ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceGreen">
                            Analysé
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceOrange">
                            En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Extraction PDF */}
      <PdfExtractionPanel id={id} modeReel={modeReel} />

      {/* Synthèse rapide */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-confidence-high">{presents}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Présentes
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-confidence-medium">{aVerifier}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            À vérifier
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-confidence-low">{manquants}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Manquantes
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-gray-400">{leCasEcheant}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Le cas échéant
          </p>
        </div>
      </section>

      {/* Checklist documentaire — groupée par phase */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy-900">
          Checklist documentaire
        </h2>

        {PHASES.map((phase) => {
          const items = checklistEffective.filter((i) => i.phase === phase);
          if (items.length === 0) return null;
          return (
            <div key={phase}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">
                {PHASE_LABELS[phase]}
              </h3>
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pièce
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.piece}>
                        <td className="px-5 py-4 font-medium text-navy-900">
                          {item.piece}
                          {item.conditionLabel && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              — {item.conditionLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_STYLE[item.statut]}`}
                          >
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">
                          {item.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Documents non classifiés */}
        {checklistEffective.filter((i) => !i.phase).length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">
              À identifier
            </h3>
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Fichier
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Statut
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checklistEffective
                    .filter((i) => !i.phase)
                    .map((item) => (
                      <tr key={item.piece}>
                        <td className="px-5 py-4 font-medium text-navy-900">
                          {item.piece}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_STYLE[item.statut]}`}
                          >
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">
                          {item.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          Liste indicative à adapter selon la situation du fonds et à valider avec un professionnel.
        </p>
      </section>

      {/* Points d'attention */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Points d&apos;attention
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-3">
          <ul className="space-y-2">
            {pointsAttention.map((point) => (
              <li key={point} className="flex gap-2 text-sm text-amber-900">
                <span className="mt-0.5 shrink-0 font-bold">→</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Synthèse provisoire */}
      <section className="rounded-lg border border-border bg-gray-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Synthèse provisoire
        </h2>
        <p className="text-sm text-muted-foreground">
          Le dossier présente {presents} pièce{presents > 1 ? "s" : ""} validée
          {presents > 1 ? "s" : ""}, {aVerifier} à vérifier et {manquants}{" "}
          manquante{manquants > 1 ? "s" : ""}. Plusieurs points structurants
          restent à confirmer avant de pouvoir transmettre le dossier à un
          professionnel. Un rapport d&apos;audit structuré peut être généré dès
          maintenant pour servir de base de travail.
        </p>
        <p className="text-xs text-muted-foreground">
          {modeReel
            ? "Statuts calculés à partir des types de documents détectés — l'analyse du contenu sera disponible dans une prochaine version."
            : "Mode démo — les statuts reflètent une cession sans aucun document déposé."}
        </p>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/dossiers/${id}/rapport`} className="btn-primary">
          Générer le rapport d&apos;audit
        </Link>
        <Link href={`/dossiers/${id}/documents`} className="btn-secondary">
          Retour aux documents
        </Link>
      </div>
    </div>
  );
}
