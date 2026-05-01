"use client";

import { useState } from "react";
import { getDocumentLabel } from "@/lib/document-labels";
import {
  genererConstats,
  type Constat,
  type NiveauConstat,
} from "@/lib/extractors/insights";
import type {
  DocumentExtrait,
  StructuredExtractionResponse,
} from "@/lib/extractors/types";

// ── Types internes ───────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "done" | "error";

// ── Formateurs ───────────────────────────────────────────────────────────────

function formatEuros(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Tri et styles des constats ───────────────────────────────────────────────

const NIVEAU_STYLE: Record<NiveauConstat, string> = {
  attention: "bg-amber-50 text-amber-900 border-amber-200",
  verification: "bg-orange-50 text-orange-900 border-orange-200",
  information: "bg-blue-50 text-blue-900 border-blue-200",
};

const NIVEAU_LABEL: Record<NiveauConstat, string> = {
  attention: "Point d'attention",
  verification: "À vérifier",
  information: "Information",
};

const NIVEAU_ORDRE: Record<NiveauConstat, number> = {
  attention: 0,
  verification: 1,
  information: 2,
};

// ── Carte résumé compact par document ────────────────────────────────────────

function ResumeDoc({ doc }: { doc: DocumentExtrait }) {
  if ("non_extractible" in doc.extraction) return null;

  const lignes: { label: string; valeur: string }[] = [];

  if (doc.extraction.type === "kbis") {
    const e = doc.extraction;
    if (e.denomination.valeur)
      lignes.push({ label: "Dénomination", valeur: e.denomination.valeur });
    if (e.siren.valeur) lignes.push({ label: "SIREN", valeur: e.siren.valeur });
    if (e.capital_social.valeur !== null)
      lignes.push({
        label: "Capital social",
        valeur: formatEuros(e.capital_social.valeur),
      });
  } else if (doc.extraction.type === "bilans_comptes_annuels") {
    const e = doc.extraction;
    if (e.exercice.valeur !== null)
      lignes.push({ label: "Exercice", valeur: String(e.exercice.valeur) });
    if (e.chiffre_affaires.valeur !== null)
      lignes.push({
        label: "Chiffre d'affaires",
        valeur: formatEuros(e.chiffre_affaires.valeur),
      });
    if (e.resultat_net.valeur !== null)
      lignes.push({
        label: "Résultat net",
        valeur: formatEuros(e.resultat_net.valeur),
      });
  } else if (doc.extraction.type === "bail_commercial") {
    const e = doc.extraction;
    if (e.duree_annees.valeur !== null)
      lignes.push({ label: "Durée", valeur: `${e.duree_annees.valeur} ans` });
    if (e.loyer_annuel.valeur !== null)
      lignes.push({
        label: "Loyer annuel",
        valeur: formatEuros(e.loyer_annuel.valeur),
      });
    if (e.bailleur.valeur)
      lignes.push({ label: "Bailleur", valeur: e.bailleur.valeur });
  }

  if (lignes.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-white px-5 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">
          {doc.nom_fichier}
        </p>
        {doc.type_document && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200">
            {getDocumentLabel(doc.type_document)}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
        {lignes.map((l) => (
          <div key={l.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{l.label}</dt>
            <dd className="truncate text-sm font-medium text-navy-900">
              {l.valeur}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Panneau principal ────────────────────────────────────────────────────────

export default function SyntheseExtractionsPanel({
  id,
  modeReel,
}: {
  id: string;
  modeReel: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<StructuredExtractionResponse | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  if (!modeReel) {
    return (
      <section className="space-y-3 rounded-lg border border-border bg-white p-6">
        <h2 className="text-xl font-semibold text-navy-900">
          Synthèse documentaire
        </h2>
        <p className="text-sm italic text-muted-foreground">
          Disponible uniquement pour les dossiers réels.
        </p>
      </section>
    );
  }

  const lancer = async () => {
    setStatus("loading");
    setResult(null);
    setErreur(null);
    try {
      const res = await fetch(`/api/dossiers/${id}/structured-extraction`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data: StructuredExtractionResponse = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setErreur(
        "La synthèse n'a pas pu être générée. Vérifiez que des PDF ont été déposés pour ce dossier.",
      );
      setStatus("error");
    }
  };

  const constats: Constat[] = result ? genererConstats(result.documents) : [];
  const constatsTries = [...constats].sort(
    (a, b) => NIVEAU_ORDRE[a.niveau] - NIVEAU_ORDRE[b.niveau],
  );
  const documentsExploitables =
    result?.documents.filter((d) => !("non_extractible" in d.extraction)) ?? [];
  const total = result?.documents.length ?? 0;

  return (
    <section className="space-y-5 rounded-lg border border-border bg-white p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-navy-900">
            Synthèse documentaire
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Synthèse préparatoire indicative générée à partir des documents
            PDF déposés. Aucune analyse juridique n&apos;est effectuée
            automatiquement — chaque information détectée doit être vérifiée
            avec un professionnel.
          </p>
        </div>
        <button
          type="button"
          onClick={lancer}
          disabled={status === "loading"}
          className="btn-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading"
            ? "Analyse en cours…"
            : status === "done"
              ? "Régénérer la synthèse"
              : "Générer une synthèse à partir des documents déposés"}
        </button>
      </div>

      {/* État initial */}
      {status === "idle" && (
        <p className="text-sm italic text-muted-foreground">
          Cliquez sur le bouton ci-dessus pour générer une synthèse à partir
          des documents PDF déposés sur ce dossier.
        </p>
      )}

      {/* Erreur */}
      {status === "error" && erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {erreur}
        </div>
      )}

      {/* Résultats */}
      {status === "done" && result && (
        <div className="space-y-5">
          {total === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              Aucun document PDF n&apos;a été détecté pour ce dossier.
            </p>
          ) : (
            <>
              {/* Bandeau récapitulatif */}
              <p className="text-sm text-navy-800">
                <strong>{total}</strong> document{total > 1 ? "s" : ""} PDF
                analysé{total > 1 ? "s" : ""}
                {documentsExploitables.length > 0 && (
                  <>
                    {" "}
                    —{" "}
                    <strong>{documentsExploitables.length}</strong> avec des
                    informations détectées
                  </>
                )}
                .
              </p>

              {/* Résumés par document exploitable */}
              {documentsExploitables.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-navy-800">
                    Informations détectées
                  </h3>
                  <div className="space-y-2">
                    {documentsExploitables.map((doc) => (
                      <ResumeDoc key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
              )}

              {/* Constats */}
              {constatsTries.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-navy-800">
                    Constats issus des documents
                  </h3>
                  <ul className="space-y-2">
                    {constatsTries.map((c, idx) => (
                      <li
                        key={idx}
                        className={`rounded-lg border px-4 py-3 text-sm ${NIVEAU_STYLE[c.niveau]}`}
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide sm:mt-0.5">
                            {NIVEAU_LABEL[c.niveau]}
                          </span>
                          <span className="flex-1 leading-relaxed">
                            {c.message}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <p className="border-t border-border pt-3 text-xs italic text-muted-foreground">
            Cette synthèse est indicative. Elle est produite par lecture
            automatique des PDF et peut comporter des informations non
            détectées. Elle ne constitue pas une analyse juridique et ne
            remplace pas l&apos;avis d&apos;un professionnel.
          </p>
        </div>
      )}
    </section>
  );
}
