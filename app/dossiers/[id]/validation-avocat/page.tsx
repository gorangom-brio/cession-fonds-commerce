"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import DossierStepper from "../DossierStepper";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Champs = {
  nom: string;
  email: string;
  telephone: string;
  message: string;
  consentement: boolean;
};

const CHAMPS_VIDES: Champs = {
  nom: "",
  email: "",
  telephone: "",
  message: "",
  consentement: false,
};

const ceQuiSeraTransmis = [
  "L'identifiant du dossier d'audit",
  "La synthèse générale de l'audit documentaire",
  "La liste des pièces analysées et manquantes",
  "Les points d'attention juridiques identifiés",
  "Les risques classifiés par niveau",
  "Les recommandations issues de l'audit",
];

const etapesValidation = [
  {
    numero: "1",
    titre: "Transmission du dossier",
    detail:
      "Le rapport d'audit et les éléments du dossier sont transmis à un avocat spécialisé en cession de fonds de commerce.",
  },
  {
    numero: "2",
    titre: "Qualification juridique",
    detail:
      "L'avocat analyse le dossier, identifie les points bloquants et évalue la faisabilité de la cession dans les conditions envisagées.",
  },
  {
    numero: "3",
    titre: "Retour et recommandations",
    detail:
      "L'avocat formule ses observations, conseille les parties et, si le dossier est prêt, peut préparer ou relire les actes nécessaires.",
  },
];

export default function DossierValidationAvocatPage() {
  const { id } = useParams<{ id: string }>();
  const modeReel = !!id && IS_UUID.test(id);
  const [champs, setChamps] = useState<Champs>(CHAMPS_VIDES);
  const [envoye, setEnvoye] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [persistanceOk, setPersistanceOk] = useState<boolean | null>(null);

  const peutSoumettre =
    champs.nom.trim().length > 0 &&
    champs.email.trim().length > 0 &&
    champs.message.trim().length > 0 &&
    champs.consentement;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!peutSoumettre || submitting) return;

    if (!modeReel) {
      setPersistanceOk(false);
      setEnvoye(true);
      return;
    }

    setSubmitting(true);
    try {
      const { insertValidationRequest } = await import(
        "@/lib/supabase/client"
      );
      await insertValidationRequest({
        cession_id: id,
        dossier_id: id,
        nom: champs.nom,
        email: champs.email,
        telephone: champs.telephone || null,
        message: champs.message,
        consentement: champs.consentement,
        source: "rapport_validation_avocat",
      });
      setPersistanceOk(true);
    } catch (err) {
      console.warn(
        "[validation_requests] Demande non persistée (Supabase indisponible) :",
        err
      );
      setPersistanceOk(false);
    } finally {
      setSubmitting(false);
      setEnvoye(true);
    }
  };

  const set = (champ: keyof Champs) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setChamps((prev) => ({ ...prev, [champ]: e.target.value }));

  if (envoye) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <DossierStepper id={id} />

      <div className="space-y-3">
          <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
          <h1 className="text-4xl font-bold text-navy-900">
            Demande enregistrée
          </h1>
        </div>

        <div className="rounded-lg border border-confidence-high/30 bg-confidence-high/10 p-8 space-y-4 text-center">
          <p className="text-2xl font-bold text-confidence-high">✓</p>
          <p className="text-lg font-semibold text-navy-900">
            Votre demande a bien été enregistrée.
          </p>
          <p className="text-sm text-muted-foreground">
            Elle sera traitée manuellement. Vous pourrez être recontacté à
            l&apos;adresse <strong>{champs.email}</strong>. Aucun envoi
            automatique à un avocat n&apos;est effectué à ce stade.
          </p>
          {persistanceOk === false && (
            <p className="text-xs text-muted-foreground">
              {modeReel
                ? "L'enregistrement serveur n'a pas pu être confirmé. Vos coordonnées sont affichées localement uniquement."
                : "Mode démo local — aucun enregistrement en base. Vos coordonnées sont affichées uniquement sur cette page."}
            </p>
          )}
        </div>

        <div className="disclaimer">
          Cette demande ne constitue pas une consultation juridique et
          n&apos;engage aucun avocat. Aucun mandat n&apos;est accepté
          automatiquement.
        </div>

        <div className="flex flex-wrap gap-4">
          <Link href={`/dossiers/${id}/rapport`} className="btn-secondary">
            Revenir au rapport
          </Link>
          <Link href={`/dossiers/${id}`} className="btn-outline">
            Tableau de bord du dossier
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <DossierStepper id={id} />

      {/* En-tête */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
        <h1 className="text-4xl font-bold text-navy-900">
          Demander une validation avocat
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          L&apos;audit documentaire a identifié les points essentiels du
          dossier. Avant toute signature ou engagement, une validation par un
          avocat spécialisé est recommandée.
        </p>
      </div>

      {/* Alerte prudence juridique */}
      <div className="disclaimer">
        L&apos;audit IA ne remplace pas une consultation juridique. La
        validation avocat est nécessaire avant toute signature ou rédaction
        d&apos;un acte engageant les parties.
      </div>

      {/* Ce qui sera transmis */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Ce qui sera transmis à l&apos;avocat
        </h2>
        <div className="rounded-lg border border-border bg-white p-6">
          <ul className="space-y-2">
            {ceQuiSeraTransmis.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-navy-900">
                <span className="mt-0.5 shrink-0 text-confidence-high font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Déroulé de la validation */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Comment se déroule la validation
        </h2>
        <div className="space-y-3">
          {etapesValidation.map(({ numero, titre, detail }) => (
            <div
              key={numero}
              className="flex gap-4 rounded-lg border border-border bg-white p-5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white">
                {numero}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-navy-900">{titre}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formulaire */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Vos coordonnées
        </h2>
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-white p-6 space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="form-field">
              <label className="form-label" htmlFor="va-nom">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <input
                id="va-nom"
                type="text"
                className="form-input"
                placeholder="Jean Dupont"
                value={champs.nom}
                onChange={set("nom")}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="va-email">
                Adresse e-mail <span className="text-red-500">*</span>
              </label>
              <input
                id="va-email"
                type="email"
                className="form-input"
                placeholder="jean.dupont@exemple.fr"
                value={champs.email}
                onChange={set("email")}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="va-telephone">
              Téléphone{" "}
              <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <input
              id="va-telephone"
              type="tel"
              className="form-input"
              placeholder="06 00 00 00 00"
              value={champs.telephone}
              onChange={set("telephone")}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="va-message">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="va-message"
              className="form-input min-h-32"
              placeholder="Décrivez brièvement votre situation : nature du fonds, stade de la cession, questions spécifiques..."
              value={champs.message}
              onChange={set("message")}
              required
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="va-consentement"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-navy-700"
              checked={champs.consentement}
              onChange={(e) =>
                setChamps((prev) => ({ ...prev, consentement: e.target.checked }))
              }
              required
            />
            <label
              htmlFor="va-consentement"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Je comprends qu&apos;il s&apos;agit d&apos;une demande de
              validation juridique par un professionnel du droit, et que
              l&apos;audit documentaire fourni ne constitue pas un conseil
              juridique.
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={!peutSoumettre || submitting}
            >
              {submitting ? "Envoi en cours…" : "Envoyer la demande"}
            </button>
            <Link href={`/dossiers/${id}/rapport`} className="btn-secondary">
              Revenir au rapport
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            {modeReel
              ? "Vos coordonnées sont enregistrées en base et la demande est tracée pour traitement manuel. Aucun envoi automatique à un avocat n'est effectué à ce stade."
              : "Mode démo local — aucun enregistrement en base. La persistance réelle n'est active que pour les dossiers identifiés par un UUID Supabase."}
          </p>
        </form>
      </section>
    </div>
  );
}
