import Link from "next/link";
import DossierStepper from "../DossierStepper";

type DossierRapportPageProps = {
  params: Promise<{ id: string }>;
};

const piecesAnalysees = [
  "Bail commercial",
  "Kbis / pièce administrative du fonds",
  "Bilans et comptes annuels (2 exercices sur 3 demandés)",
  "Contrats de travail",
  "Bulletins de salaire",
];

const piecesManquantes = [
  { piece: "Pièces fiscales", detail: "Liasses fiscales N-1 et N-2 non fournies." },
  { piece: "Actifs incorporels / marque / nom commercial", detail: "Inclusion ou exclusion dans la cession à préciser." },
  { piece: "Autorisations administratives", detail: "Selon l'activité du fonds, certaines autorisations peuvent conditionner la cession." },
  { piece: "Contrats fournisseurs utiles", detail: "Contrats structurants à identifier et à intégrer au dossier." },
];

const pointsAttention = [
  {
    titre: "Clause de cession du bail",
    detail:
      "Le bail commercial doit contenir une clause autorisant la cession avec le fonds. L'accord préalable du bailleur est souvent requis. En son absence ou en cas de restriction, la cession peut être bloquée.",
  },
  {
    titre: "Salariés repris",
    detail:
      "Le transfert automatique des contrats de travail s'applique en cas de cession de fonds (article L. 1224-1 du Code du travail). La liste nominative, les anciennetés et les conditions de reprise doivent être vérifiées.",
  },
  {
    titre: "Actifs incorporels transmis",
    detail:
      "La clientèle, l'enseigne, le nom commercial et la marque sont des éléments essentiels du fonds. Leur inclusion ou exclusion dans l'acte de cession doit être formulée explicitement.",
  },
  {
    titre: "Cohérence prix / éléments comptables",
    detail:
      "Le prix de cession doit être mis en regard du chiffre d'affaires, des résultats et de la valorisation des actifs. Un écart significatif entre le prix et les éléments financiers peut exposer vendeur et acheteur à des risques fiscaux ou de requalification.",
  },
];

const risques = [
  {
    niveau: "Élevé" as const,
    texte: "Clause de cession du bail non vérifiée — risque de blocage de la cession.",
  },
  {
    niveau: "Modéré" as const,
    texte: "Pièces fiscales manquantes — risque de remise en cause de la valorisation.",
  },
  {
    niveau: "Modéré" as const,
    texte: "Actifs incorporels non documentés — risque de litige post-cession sur le périmètre transmis.",
  },
  {
    niveau: "À surveiller" as const,
    texte: "Bilans incomplets (2/3 exercices) — analyse de tendance partielle.",
  },
];

const NIVEAU_STYLE: Record<"Élevé" | "Modéré" | "À surveiller", string> = {
  Élevé: "confidenceRed",
  Modéré: "confidenceOrange",
  "À surveiller": "bg-blue-50 border border-blue-200 text-blue-800",
};

export default async function DossierRapportPage({
  params,
}: DossierRapportPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <DossierStepper id={id} />

      {/* En-tête */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
        <h1 className="text-4xl font-bold text-navy-900">
          Rapport d&apos;audit du dossier
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Ce rapport présente les résultats de l&apos;audit documentaire simulé.
          Il est destiné à préparer une cession de fonds de commerce dans de
          bonnes conditions, avant validation éventuelle par un avocat.
        </p>
        <p className="text-xs text-muted-foreground">
          Rapport généré en mode démo local — aucune analyse IA effectuée à ce stade.
        </p>
      </div>

      {/* Synthèse générale */}
      <section className="rounded-lg border border-navy-200 bg-navy-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">Synthèse générale</h2>
        <p className="text-sm text-navy-800 leading-relaxed">
          Le dossier est partiellement constitué. Cinq pièces essentielles ont
          été identifiées et analysées. Quatre documents structurants restent
          manquants ou à compléter avant de pouvoir engager sereinement la
          suite de la cession. Plusieurs points juridiques importants doivent
          être vérifiés, en particulier sur le bail commercial et le périmètre
          exact des actifs transmis.
        </p>
        <p className="text-sm text-navy-800 leading-relaxed">
          Ce dossier est exploitable pour une première orientation, mais{" "}
          <strong>
            nécessite une validation par un avocat spécialisé avant toute
            signature ou rédaction d&apos;un acte engageant.
          </strong>
        </p>
      </section>

      {/* Pièces analysées */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Pièces analysées
        </h2>
        <div className="rounded-lg border border-border bg-white p-6">
          <ul className="space-y-2">
            {piecesAnalysees.map((piece) => (
              <li key={piece} className="flex items-start gap-2 text-sm text-navy-900">
                <span className="mt-0.5 shrink-0 font-bold text-confidence-high">✓</span>
                {piece}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pièces manquantes */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Pièces manquantes ou à compléter
        </h2>
        <div className="rounded-lg border border-border bg-white divide-y divide-border">
          {piecesManquantes.map(({ piece, detail }) => (
            <div key={piece} className="px-6 py-4 space-y-0.5">
              <p className="text-sm font-semibold text-navy-900">{piece}</p>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Points d'attention */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Points d&apos;attention juridiques
        </h2>
        <div className="space-y-3">
          {pointsAttention.map(({ titre, detail }) => (
            <div
              key={titre}
              className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 space-y-1"
            >
              <p className="text-sm font-semibold text-amber-900">→ {titre}</p>
              <p className="text-sm text-amber-800 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Risques */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Risques identifiés
        </h2>
        <div className="rounded-lg border border-border bg-white divide-y divide-border">
          {risques.map(({ niveau, texte }) => (
            <div
              key={texte}
              className="flex items-start gap-4 px-6 py-4"
            >
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${NIVEAU_STYLE[niveau]}`}
              >
                {niveau}
              </span>
              <p className="text-sm text-navy-900">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommandations */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Recommandations
        </h2>
        <div className="rounded-lg border border-border bg-white p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-navy-900">1. Compléter le dossier</strong>{" "}
            en fournissant les pièces manquantes : liasses fiscales, contrats
            fournisseurs, documentation des actifs incorporels et autorisations
            administratives.
          </p>
          <p>
            <strong className="text-navy-900">2. Vérifier le bail</strong>{" "}
            avec le bailleur ou son conseil : la clause de cession doit être
            identifiée et l&apos;accord du bailleur obtenu si nécessaire.
          </p>
          <p>
            <strong className="text-navy-900">3. Clarifier le périmètre</strong>{" "}
            de la cession : lister précisément les actifs incorporels inclus
            (marque, clientèle, enseigne) et ceux exclus.
          </p>
          <p>
            <strong className="text-navy-900">4. Faire valider par un avocat</strong>{" "}
            spécialisé en droit commercial avant toute signature. Ce rapport
            peut servir de base de travail pour la consultation.
          </p>
        </div>
      </section>

      {/* Prochaine étape */}
      <section className="rounded-lg border border-border bg-gray-50 p-6 space-y-2">
        <h2 className="text-xl font-semibold text-navy-900">
          Prochaine étape conseillée
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Transmettez ce rapport à un avocat spécialisé en cession de fonds de
          commerce. Il pourra qualifier le dossier, identifier les points
          bloquants, préparer ou relire les actes, et sécuriser la transaction
          pour les deux parties.
        </p>
      </section>

      {/* Disclaimer */}
      <div className="disclaimer">
        Ce rapport est fourni à titre informatif par un outil d&apos;audit
        documentaire automatisé. Il ne constitue pas un conseil juridique et ne
        remplace pas l&apos;intervention d&apos;un avocat ou d&apos;un notaire.
        Toute décision engageante doit être prise après consultation d&apos;un
        professionnel du droit.
      </div>

      {/* CTA */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={`/dossiers/${id}/validation-avocat`}
          className="btn-primary"
        >
          Demander une validation avocat
        </Link>
        <Link href={`/dossiers/${id}/audit`} className="btn-secondary">
          Revenir à l&apos;audit
        </Link>
      </div>
    </div>
  );
}
