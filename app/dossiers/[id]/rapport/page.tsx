"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DossierStepper from "../DossierStepper";
import SyntheseExtractionsPanel from "./SyntheseExtractionsPanel";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Données simulées ────────────────────────────────────────────────────────

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
  { niveau: "Élevé" as const, texte: "Clause de cession du bail non vérifiée — risque de blocage de la cession." },
  { niveau: "Modéré" as const, texte: "Pièces fiscales manquantes — risque de remise en cause de la valorisation." },
  { niveau: "Modéré" as const, texte: "Actifs incorporels non documentés — risque de litige post-cession sur le périmètre transmis." },
  { niveau: "À surveiller" as const, texte: "Bilans incomplets (2/3 exercices) — analyse de tendance partielle." },
];

const NIVEAU_STYLE: Record<"Élevé" | "Modéré" | "À surveiller", string> = {
  Élevé: "confidenceRed",
  Modéré: "confidenceOrange",
  "À surveiller": "bg-blue-50 border border-blue-200 text-blue-800",
};

const ROLES = [
  { value: "", label: "Sélectionner votre rôle" },
  { value: "vendeur", label: "Vendeur" },
  { value: "acquereur", label: "Acquéreur" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "autre", label: "Autre" },
] as const;

// ── Types formulaire ────────────────────────────────────────────────────────

type CaptureChamps = {
  nom: string;
  email: string;
  role: string;
  telephone: string;
  consentementRapport: boolean;
  consentementRecontact: boolean;
};

const CHAMPS_VIDES: CaptureChamps = {
  nom: "",
  email: "",
  role: "",
  telephone: "",
  consentementRapport: false,
  consentementRecontact: false,
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function DossierRapportPage() {
  const { id } = useParams<{ id: string }>();
  const modeReel = !!id && IS_UUID.test(id);
  const [champs, setChamps] = useState<CaptureChamps>(CHAMPS_VIDES);
  const [envoye, setEnvoye] = useState(false);
  const [persistanceOk, setPersistanceOk] = useState<boolean | null>(null);

  const peutSoumettre =
    champs.nom.trim().length > 0 &&
    champs.email.trim().length > 0 &&
    champs.role !== "" &&
    champs.consentementRapport;

  const set =
    (champ: keyof CaptureChamps) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setChamps((prev) => ({ ...prev, [champ]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!peutSoumettre) return;

    try {
      const { insertReportLead } = await import("@/lib/supabase/client");
      await insertReportLead({
        dossier_id: id,
        nom: champs.nom,
        email: champs.email,
        role: champs.role as "vendeur" | "acquereur" | "intermediaire" | "autre",
        telephone: champs.telephone || null,
        consentement_rapport: champs.consentementRapport,
        consentement_recontact: champs.consentementRecontact,
        source: "rapport_pdf_demo",
      });
      setPersistanceOk(true);
    } catch (err) {
      console.warn("[report_leads] Lead non persisté (Supabase indisponible) :", err);
      setPersistanceOk(false);
    }

    setEnvoye(true);
  };

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

      {/* Synthèse documentaire (V2-26) — opt-in, sans persistance */}
      <SyntheseExtractionsPanel id={id ?? ""} modeReel={modeReel} />

      {/* Pièces analysées */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">Pièces analysées</h2>
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
        <h2 className="text-xl font-semibold text-navy-900">Risques identifiés</h2>
        <div className="rounded-lg border border-border bg-white divide-y divide-border">
          {risques.map(({ niveau, texte }) => (
            <div key={texte} className="flex items-start gap-4 px-6 py-4">
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
        <h2 className="text-xl font-semibold text-navy-900">Recommandations</h2>
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

      {/* ── Capture email ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border-2 border-navy-200 bg-navy-50 p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-navy-900">
            Recevoir mon rapport d&apos;audit PDF
          </h2>
          <p className="text-sm text-muted-foreground">
            Le rapport complet sera généré et envoyé à votre adresse email.
            Renseignez vos coordonnées pour le recevoir.
          </p>
        </div>

        {envoye ? (
          /* ── Confirmation ── */
          <div className="space-y-5">
            <div className="rounded-lg border border-confidence-high/30 bg-confidence-high/10 p-6 space-y-2 text-center">
              <p className="text-2xl font-bold text-confidence-high">✓</p>
              <p className="text-base font-semibold text-navy-900">
                {persistanceOk
                  ? "Votre demande a bien été enregistrée."
                  : "Votre demande de rapport PDF a bien été prise en compte."}
              </p>
              <p className="text-sm text-muted-foreground">
                Dans la version finale, le rapport PDF sera généré et envoyé
                automatiquement à{" "}
                <strong className="text-navy-900">{champs.email}</strong>.
              </p>
              {!persistanceOk && (
                <p className="text-xs text-muted-foreground">
                  Mode démo : votre demande est affichée localement, mais
                  n&apos;a pas pu être enregistrée.
                </p>
              )}
            </div>

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
        ) : (
          /* ── Formulaire ── */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="cap-nom">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  id="cap-nom"
                  type="text"
                  className="form-input"
                  placeholder="Jean Dupont"
                  value={champs.nom}
                  onChange={set("nom")}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cap-email">
                  Adresse e-mail <span className="text-red-500">*</span>
                </label>
                <input
                  id="cap-email"
                  type="email"
                  className="form-input"
                  placeholder="jean.dupont@exemple.fr"
                  value={champs.email}
                  onChange={set("email")}
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="form-field">
                <label className="form-label" htmlFor="cap-role">
                  Rôle dans l&apos;opération <span className="text-red-500">*</span>
                </label>
                <select
                  id="cap-role"
                  className="form-input"
                  value={champs.role}
                  onChange={set("role")}
                  required
                >
                  {ROLES.map(({ value, label }) => (
                    <option key={value} value={value} disabled={value === ""}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="cap-telephone">
                  Téléphone{" "}
                  <span className="font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <input
                  id="cap-telephone"
                  type="tel"
                  className="form-input"
                  placeholder="06 00 00 00 00"
                  value={champs.telephone}
                  onChange={set("telephone")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  id="cap-consentement-rapport"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-navy-700"
                  checked={champs.consentementRapport}
                  onChange={(e) =>
                    setChamps((prev) => ({
                      ...prev,
                      consentementRapport: e.target.checked,
                    }))
                  }
                  required
                />
                <label
                  htmlFor="cap-consentement-rapport"
                  className="cursor-pointer text-sm text-navy-900"
                >
                  J&apos;accepte de recevoir mon rapport d&apos;audit par email.{" "}
                  <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="cap-consentement-recontact"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-navy-700"
                  checked={champs.consentementRecontact}
                  onChange={(e) =>
                    setChamps((prev) => ({
                      ...prev,
                      consentementRecontact: e.target.checked,
                    }))
                  }
                />
                <label
                  htmlFor="cap-consentement-recontact"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  J&apos;accepte d&apos;être recontacté au sujet de mon dossier.
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Les informations saisies sont utilisées uniquement pour vous
              transmettre le rapport demandé et, si vous l&apos;acceptez, vous
              recontacter au sujet de votre dossier.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="submit"
                className="btn-primary"
                disabled={!peutSoumettre}
              >
                Recevoir mon rapport PDF
              </button>
              <Link href={`/dossiers/${id}/audit`} className="btn-secondary">
                Revenir à l&apos;audit
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Mode démo local — aucun envoi réel. La génération PDF et
              l&apos;envoi seront activés lors du branchement production.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
