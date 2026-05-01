"use client";

import { useState } from "react";
import { getDocumentLabel } from "@/lib/document-labels";
import type {
  StructuredExtractionResponse,
  DocumentExtrait,
  ExtractionResultat,
  ExtractionKbis,
  ExtractionBilan,
  ExtractionBail,
  NiveauConfiance,
} from "@/lib/extractors/types";

// ── Types internes ─────────────────────────────────────────────────────────────

type LigneAffichage = {
  label: string;
  valeur: string | null;
  confiance: NiveauConfiance;
};

type Status = "idle" | "loading" | "done" | "error";

// ── Formateurs ────────────────────────────────────────────────────────────────

function formatEuros(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Conversion extraction → lignes (toutes, pour les détails) ─────────────────

function lignesKbis(e: ExtractionKbis): LigneAffichage[] {
  return [
    { label: "Dénomination sociale", valeur: e.denomination.valeur, confiance: e.denomination.confiance },
    { label: "Forme juridique", valeur: e.forme_juridique.valeur, confiance: e.forme_juridique.confiance },
    { label: "Capital social", valeur: e.capital_social.valeur !== null ? formatEuros(e.capital_social.valeur) : null, confiance: e.capital_social.confiance },
    { label: "SIREN", valeur: e.siren.valeur, confiance: e.siren.confiance },
    { label: "Siège social", valeur: e.adresse_siege.valeur, confiance: e.adresse_siege.confiance },
    { label: "Dirigeant", valeur: e.dirigeant.valeur, confiance: e.dirigeant.confiance },
    { label: "Activité déclarée", valeur: e.activite.valeur, confiance: e.activite.confiance },
    { label: "Date d'immatriculation", valeur: e.date_immatriculation.valeur, confiance: e.date_immatriculation.confiance },
  ];
}

function lignesBilan(e: ExtractionBilan): LigneAffichage[] {
  return [
    { label: "Exercice", valeur: e.exercice.valeur !== null ? String(e.exercice.valeur) : null, confiance: e.exercice.confiance },
    { label: "Chiffre d'affaires", valeur: e.chiffre_affaires.valeur !== null ? formatEuros(e.chiffre_affaires.valeur) : null, confiance: e.chiffre_affaires.confiance },
    { label: "Résultat net", valeur: e.resultat_net.valeur !== null ? formatEuros(e.resultat_net.valeur) : null, confiance: e.resultat_net.confiance },
    { label: "Capitaux propres", valeur: e.capitaux_propres.valeur !== null ? formatEuros(e.capitaux_propres.valeur) : null, confiance: e.capitaux_propres.confiance },
  ];
}

function lignesBail(e: ExtractionBail): LigneAffichage[] {
  return [
    { label: "Bailleur", valeur: e.bailleur.valeur, confiance: e.bailleur.confiance },
    { label: "Preneur", valeur: e.preneur.valeur, confiance: e.preneur.confiance },
    { label: "Adresse des locaux", valeur: e.adresse_locaux.valeur, confiance: e.adresse_locaux.confiance },
    { label: "Date de prise d'effet", valeur: e.date_debut.valeur, confiance: e.date_debut.confiance },
    { label: "Durée", valeur: e.duree_annees.valeur !== null ? `${e.duree_annees.valeur} ans` : null, confiance: e.duree_annees.confiance },
    { label: "Loyer annuel HT", valeur: e.loyer_annuel.valeur !== null ? formatEuros(e.loyer_annuel.valeur) : null, confiance: e.loyer_annuel.confiance },
    { label: "Dépôt de garantie", valeur: e.depot_garantie.valeur !== null ? formatEuros(e.depot_garantie.valeur) : null, confiance: e.depot_garantie.confiance },
    { label: "Clause de cession", valeur: e.clause_cession_presente.valeur !== null ? (e.clause_cession_presente.valeur ? "Mentionnée" : "Non mentionnée") : null, confiance: e.clause_cession_presente.confiance },
    { label: "Destination des locaux", valeur: e.destination_locaux.valeur, confiance: e.destination_locaux.confiance },
  ];
}

function toLignes(extraction: ExtractionResultat): LigneAffichage[] {
  if ("non_extractible" in extraction) return [];
  if (extraction.type === "kbis") return lignesKbis(extraction);
  if (extraction.type === "bilans_comptes_annuels") return lignesBilan(extraction);
  if (extraction.type === "bail_commercial") return lignesBail(extraction);
  return [];
}

// ── Classement des documents ───────────────────────────────────────────────────

function estExploitable(doc: DocumentExtrait): boolean {
  if ("non_extractible" in doc.extraction) return false;
  return toLignes(doc.extraction).some((l) => l.valeur !== null);
}

// ── Composants visuels ─────────────────────────────────────────────────────────

// Petit indicateur coloré de fiabilité (synthèse uniquement)
function ConfidenceDot({ confiance }: { confiance: NiveauConfiance }) {
  const style: Record<NiveauConfiance, string> = {
    haute: "bg-green-500",
    moyenne: "bg-amber-400",
    faible: "bg-orange-400",
    non_extractible: "bg-gray-300",
  };
  const titre: Record<NiveauConfiance, string> = {
    haute: "Fiabilité haute",
    moyenne: "Fiabilité moyenne",
    faible: "Fiabilité faible",
    non_extractible: "",
  };
  if (confiance === "non_extractible") return null;
  return (
    <span
      className={`mt-1.5 inline-block w-2 h-2 rounded-full shrink-0 ${style[confiance]}`}
      title={titre[confiance]}
    />
  );
}

// Badge plein pour le tableau de détails
const CONFIANCE_BADGE: Record<NiveauConfiance, string> = {
  haute: "bg-green-50 text-green-800 ring-green-200",
  moyenne: "bg-amber-50 text-amber-800 ring-amber-200",
  faible: "bg-orange-50 text-orange-800 ring-orange-200",
  non_extractible: "bg-gray-100 text-gray-400 ring-gray-200",
};
const CONFIANCE_LABEL: Record<NiveauConfiance, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  faible: "Faible",
  non_extractible: "—",
};
function ConfidenceBadge({ confiance }: { confiance: NiveauConfiance }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CONFIANCE_BADGE[confiance]}`}>
      {CONFIANCE_LABEL[confiance]}
    </span>
  );
}

// Carte synthèse : uniquement les champs détectés, format compact
function SyntheseDoc({ doc }: { doc: DocumentExtrait }) {
  const lignes = toLignes(doc.extraction).filter((l) => l.valeur !== null);

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3 bg-white">
        <p className="font-medium text-sm text-navy-900 flex-1 truncate min-w-0">
          {doc.nom_fichier}
        </p>
        {doc.type_document && (
          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200 shrink-0">
            {getDocumentLabel(doc.type_document)}
          </span>
        )}
      </div>
      <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {lignes.map((ligne) => (
          <div key={ligne.label} className="flex items-start gap-2 min-w-0">
            <ConfidenceDot confiance={ligne.confiance} />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{ligne.label}</dt>
              <dd className="text-sm font-medium text-navy-900 break-words">
                {ligne.valeur}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="px-5 pb-3 text-xs text-muted-foreground">
        {lignes.length} information{lignes.length > 1 ? "s" : ""} détectée
        {lignes.length > 1 ? "s" : ""} — indicatif, à vérifier
      </p>
    </div>
  );
}

// Message pour les documents non exploitables
const RAISON_MESSAGE: Record<string, { titre: string; detail: string }> = {
  pdf_scanne: {
    titre: "Document présent, texte non lisible automatiquement",
    detail:
      "Ce document est un PDF image ou scanné. Son contenu ne peut pas être analysé automatiquement. Une vérification manuelle est recommandée.",
  },
  texte_insuffisant: {
    titre: "Texte insuffisant pour l'analyse automatique",
    detail:
      "Le texte extrait de ce document est trop court pour être analysé. Vérifiez que le fichier est complet.",
  },
  type_non_supporte: {
    titre: "Type non encore analysé dans cette version",
    detail:
      "Ce type de document n'est pas encore pris en charge par l'extraction automatique. Il a bien été comptabilisé dans la checklist.",
  },
};
const RAISON_VIDE = {
  titre: "Informations non détectées",
  detail:
    "L'extraction automatique n'a pas pu identifier d'informations dans ce document. Une vérification manuelle est recommandée.",
};

function AlerteDoc({ doc }: { doc: DocumentExtrait }) {
  const msg =
    "non_extractible" in doc.extraction
      ? (RAISON_MESSAGE[doc.extraction.raison] ?? RAISON_VIDE)
      : RAISON_VIDE;

  return (
    <div className="rounded-lg border border-border bg-white px-5 py-4 flex items-start gap-4">
      <div className="mt-0.5 flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-navy-900 truncate">
            {doc.nom_fichier}
          </p>
          {doc.type_document && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 shrink-0">
              {getDocumentLabel(doc.type_document)}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-navy-800">{msg.titre}</p>
        <p className="text-xs text-muted-foreground">{msg.detail}</p>
      </div>
    </div>
  );
}

// Tableau complet pour la section détails (tous les champs, y compris non détectés)
function TableauDetails({ doc }: { doc: DocumentExtrait }) {
  const lignes = toLignes(doc.extraction);

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-border flex flex-wrap items-center gap-3">
        <p className="font-medium text-sm text-navy-900 flex-1 truncate min-w-0">
          {doc.nom_fichier}
        </p>
        {doc.type_document && (
          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200 shrink-0">
            {getDocumentLabel(doc.type_document)}
          </span>
        )}
      </div>
      {"non_extractible" in doc.extraction ? (
        <p className="px-5 py-4 text-sm text-muted-foreground italic">
          {(RAISON_MESSAGE[doc.extraction.raison] ?? RAISON_VIDE).detail}
        </p>
      ) : lignes.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground italic">
          Aucun champ disponible pour ce type.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="px-5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-2/5">
                Champ
              </th>
              <th className="px-5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-2/5">
                Valeur détectée
              </th>
              <th className="px-5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-1/5">
                Fiabilité
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((ligne) => (
              <tr key={ligne.label}>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {ligne.label}
                </td>
                <td className="px-5 py-3 font-medium text-navy-900">
                  {ligne.valeur ?? (
                    <span className="text-muted-foreground italic text-xs font-normal">
                      Non détecté
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {ligne.valeur !== null && (
                    <ConfidenceBadge confiance={ligne.confiance} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Panneau principal ──────────────────────────────────────────────────────────

export default function StructuredExtractionPanel({
  id,
  modeReel,
}: {
  id: string;
  modeReel: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<StructuredExtractionResponse | null>(null);
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);

  if (!modeReel) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Informations clés détectées
        </h2>
        <p className="text-sm text-muted-foreground italic">
          Disponible uniquement pour les dossiers réels.
        </p>
      </section>
    );
  }

  const lancer = async () => {
    setStatus("loading");
    setResult(null);
    setErreurGlobale(null);
    try {
      const res = await fetch(`/api/dossiers/${id}/structured-extraction`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data: StructuredExtractionResponse = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setErreurGlobale(
        "L'extraction a échoué. Vérifiez que des PDF ont été déposés pour ce dossier."
      );
      setStatus("error");
    }
  };

  // Partition des documents
  const exploitables = result?.documents.filter(estExploitable) ?? [];
  const aVerifier = result?.documents.filter((d) => !estExploitable(d)) ?? [];
  const total = result?.documents.length ?? 0;

  return (
    <section className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-navy-900">
            Informations clés détectées
          </h2>
          <p className="text-xs text-muted-foreground">
            Extraction automatique sur Kbis, bilans et bail commercial.
            Résultats indicatifs — à vérifier avec un professionnel.
          </p>
        </div>
        <button
          type="button"
          onClick={lancer}
          disabled={status === "loading"}
          className="btn-secondary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading"
            ? "Analyse en cours…"
            : status === "done"
            ? "Relancer l'extraction"
            : "Tester l'extraction structurée"}
        </button>
      </div>

      {/* Erreur */}
      {status === "error" && erreurGlobale && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {erreurGlobale}
        </div>
      )}

      {/* Résultats */}
      {status === "done" && result && (
        <div className="space-y-6">

          {/* Barre de synthèse */}
          {total > 0 && (
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-muted-foreground">
                <strong className="text-navy-900">{total}</strong>{" "}
                document{total > 1 ? "s" : ""} analysé{total > 1 ? "s" : ""}
              </span>
              {exploitables.length > 0 && (
                <span className="text-green-700">
                  <strong>{exploitables.length}</strong> exploitable
                  {exploitables.length > 1 ? "s" : ""}
                </span>
              )}
              {aVerifier.length > 0 && (
                <span className="text-muted-foreground">
                  <strong>{aVerifier.length}</strong> à vérifier manuellement
                </span>
              )}
            </div>
          )}

          {/* Aucun PDF */}
          {total === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Aucun fichier PDF trouvé pour ce dossier.
            </p>
          )}

          {/* Documents exploitables */}
          {exploitables.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-800">
                Informations détectées
              </h3>
              {exploitables.map((doc) => (
                <SyntheseDoc key={doc.id} doc={doc} />
              ))}
            </div>
          )}

          {/* Documents à vérifier */}
          {aVerifier.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-800">
                Documents à vérifier manuellement
              </h3>
              <div className="space-y-2">
                {aVerifier.map((doc) => (
                  <AlerteDoc key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}

          {/* Détails techniques repliables */}
          {total > 0 && (
            <details className="group rounded-lg border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-navy-800 hover:bg-gray-50 transition-colors">
                <span>Détails de l&apos;extraction</span>
                <span className="text-muted-foreground text-xs group-open:hidden">
                  Afficher ↓
                </span>
                <span className="text-muted-foreground text-xs hidden group-open:inline">
                  Masquer ↑
                </span>
              </summary>
              <div className="border-t border-border px-5 py-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Résultats bruts de l&apos;extraction, champ par champ, y compris les
                  informations non détectées. Ces données sont indicatives et ne
                  constituent pas une analyse juridique.
                </p>
                {result.documents.map((doc) => (
                  <TableauDetails key={doc.id} doc={doc} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
