"use client";

import { useState } from "react";
import type {
  StructuredExtractionResponse,
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

// ── Conversion extraction → lignes affichables ─────────────────────────────────

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

function toLignes(extraction: ExtractionResultat): LigneAffichage[] | null {
  if ("non_extractible" in extraction) return null;
  if (extraction.type === "kbis") return lignesKbis(extraction);
  if (extraction.type === "bilans_comptes_annuels") return lignesBilan(extraction);
  if (extraction.type === "bail_commercial") return lignesBail(extraction);
  return null;
}

// ── Composants ─────────────────────────────────────────────────────────────────

const CONFIANCE_STYLE: Record<NiveauConfiance, string> = {
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
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CONFIANCE_STYLE[confiance]}`}
    >
      {CONFIANCE_LABEL[confiance]}
    </span>
  );
}

const RAISON_LABEL: Record<string, string> = {
  pdf_scanne:
    "PDF scanné ou non extractible — une version numérique est nécessaire pour l'analyse automatique.",
  texte_insuffisant:
    "Texte insuffisant pour l'extraction structurée.",
  type_non_supporte:
    "Type documentaire non pris en charge dans cette version (Kbis, bilan et bail uniquement).",
};

function ExtractionCard({ extraction }: { extraction: ExtractionResultat }) {
  if ("non_extractible" in extraction) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground italic">
        {RAISON_LABEL[extraction.raison] ?? "Non extractible."}
      </p>
    );
  }

  const lignes = toLignes(extraction);
  if (!lignes) return null;

  const renseignees = lignes.filter((l) => l.valeur !== null).length;

  return (
    <div className="divide-y divide-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
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
      <p className="px-5 py-2 text-xs text-muted-foreground">
        {renseignees} champ{renseignees > 1 ? "s" : ""} détecté
        {renseignees > 1 ? "s" : ""} sur {lignes.length}
      </p>
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
          Extraction structurée
        </h2>
        <p className="text-sm text-muted-foreground italic">
          Extraction structurée disponible uniquement pour les dossiers réels.
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
        "L'extraction structurée a échoué. Vérifiez que des PDF ont été déposés pour ce dossier."
      );
      setStatus("error");
    }
  };

  const nbSupported =
    result?.documents.filter((d) => !("non_extractible" in d.extraction))
      .length ?? 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-navy-900">
            Extraction structurée
          </h2>
          <p className="text-xs text-muted-foreground">
            Informations clés extraites automatiquement des documents déposés.
            Prise en charge : Kbis, bilans, bail commercial.
          </p>
        </div>
        <button
          type="button"
          onClick={lancer}
          disabled={status === "loading"}
          className="btn-secondary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading"
            ? "Extraction en cours…"
            : "Tester l'extraction structurée"}
        </button>
      </div>

      {status === "error" && erreurGlobale && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {erreurGlobale}
        </div>
      )}

      {status === "done" && result && (
        <div className="space-y-4">
          {/* Disclaimer obligatoire */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800 leading-relaxed">
            Ces informations sont extraites automatiquement par analyse textuelle.
            Elles sont <strong>indicatives</strong>, peuvent être inexactes et{" "}
            <strong>ne constituent pas une analyse juridique</strong>. Toute
            décision doit être prise après vérification par un professionnel.
          </div>

          {result.documents.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Aucun fichier PDF trouvé pour ce dossier.
            </p>
          )}

          {result.documents.length > 0 && nbSupported === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Aucun document de type pris en charge (Kbis, bilan, bail) n&apos;a
              pu être analysé. Vérifiez les types détectés dans la section
              &quot;Pièces réellement déposées&quot;.
            </p>
          )}

          {result.documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-border bg-white overflow-hidden"
            >
              <div className="px-5 py-3 bg-gray-50 border-b border-border flex flex-wrap items-center gap-3">
                <p className="font-medium text-sm text-navy-900 flex-1 truncate min-w-0">
                  {doc.nom_fichier}
                </p>
                {doc.type_document && (
                  <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200 shrink-0">
                    {doc.type_document}
                  </span>
                )}
              </div>
              <ExtractionCard extraction={doc.extraction} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
