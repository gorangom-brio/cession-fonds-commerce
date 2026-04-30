import Link from "next/link";
import { getDocumentLabel } from "@/lib/document-labels";
import DossierStepper from "../DossierStepper";
import PdfExtractionPanel from "./PdfExtractionPanel";
import StructuredExtractionPanel from "./StructuredExtractionPanel";
import AuditChecklistSection, {
  type DocumentReel,
} from "./AuditChecklistSection";
import type { SituationDossier } from "@/lib/situation";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DossierAuditPageProps = {
  params: Promise<{ id: string }>;
};

const pointsAttention = [
  "Vérifier la clause de cession du bail : accord du bailleur requis avant toute cession.",
  "Vérifier la cohérence du prix avec les éléments comptables : chiffre d'affaires, résultats, valorisation du fonds.",
  "Vérifier les salariés transférés : liste nominative, ancienneté, conditions de reprise.",
  "Vérifier les actifs incorporels inclus ou exclus de la cession : marque, enseigne, nom commercial, clientèle.",
];

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

  let documentsReels: DocumentReel[] = [];
  let erreurSupabase = false;
  let initialSituation: SituationDossier | undefined;

  if (modeReel) {
    try {
      const { getDocumentsByCessionId, getCessionById } = await import(
        "@/lib/supabase/server"
      );
      const [docs, cession] = await Promise.all([
        getDocumentsByCessionId(id),
        getCessionById(id),
      ]);
      documentsReels = docs;
      if (cession.situation_declaree && typeof cession.situation_declaree === "object" && !Array.isArray(cession.situation_declaree)) {
        initialSituation = cession.situation_declaree as SituationDossier;
      }
    } catch {
      erreurSupabase = true;
    }
  }

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

      {/* Pièces réellement déposées */}
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

      {/* Extraction PDF brute */}
      <PdfExtractionPanel id={id} modeReel={modeReel} />

      {/* Extraction structurée par type documentaire */}
      <StructuredExtractionPanel id={id} modeReel={modeReel} />

      {/* Questionnaire de situation + Synthèse + Checklist */}
      <AuditChecklistSection
        documentsReels={documentsReels}
        modeReel={modeReel}
        erreurSupabase={erreurSupabase}
        initialSituation={initialSituation}
      />

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
