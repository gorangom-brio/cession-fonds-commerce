"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewDossierPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [contexte, setContexte] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const id = `demo-${Date.now()}`;
    router.push(`/dossiers/${id}`);
  };

  const peutCreer = nom.trim().length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
          Dossier
        </span>
        <h1 className="text-4xl font-bold text-navy-900">
          Créer un dossier d&apos;audit
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Cette première étape sert à centraliser les pièces de la cession et à
          préparer un audit documentaire clair avant toute validation avocat.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-white p-6 space-y-5"
        >
          <div className="space-y-2">
            <label className="form-label" htmlFor="dossier-nom">
              Nom du dossier
            </label>
            <input
              id="dossier-nom"
              className="form-input"
              placeholder="Ex : Cession boulangerie Dupont"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="form-label" htmlFor="dossier-contexte">
              Contexte
            </label>
            <textarea
              id="dossier-contexte"
              className="form-input min-h-32"
              placeholder="Vendeur, acquéreur, statut du compromis, pièces déjà disponibles..."
              value={contexte}
              onChange={(event) => setContexte(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="btn-primary"
              disabled={!peutCreer || submitting}
            >
              {submitting ? "Création en cours..." : "Créer le dossier d'audit"}
            </button>
            <Link href="/" className="btn-secondary">
              Revenir à l&apos;accueil
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Mode démo local : un identifiant temporaire est généré pour tester
            le parcours d&apos;audit. La persistance du dossier sera branchée
            dans une prochaine mission.
          </p>
        </form>

        <aside className="rounded-lg border border-border bg-gray-50 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-navy-900">
            Ce que ce dossier préparera
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Une zone unique pour les documents de la cession</li>
            <li>Un futur audit des pièces présentes et manquantes</li>
            <li>Un rapport d&apos;audit transmissible à un avocat</li>
            <li>Une base compatible avec la génération d&apos;actes plus tard</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
