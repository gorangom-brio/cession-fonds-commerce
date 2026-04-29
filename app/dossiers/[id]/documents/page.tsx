"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import DossierStepper from "../DossierStepper";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

type StatutFichier = "attente" | "telechargement" | "televerse" | "erreur";

type FichierLocal = {
  nom: string;
  taille: number;
  type: string;
  statut: StatutFichier;
  file: File;
};

const expectedDocuments = [
  "Bail commercial ou droit au bail",
  "Kbis ou pièce administrative du fonds",
  "Bilans et documents comptables",
  "Pièces fiscales",
  "Contrats utiles et annexes",
  "Compromis ou projet existant s'il existe déjà",
];

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function BadgeStatut({ statut }: { statut: StatutFichier }) {
  if (statut === "attente")
    return <span className="text-muted-foreground">En attente…</span>;
  if (statut === "telechargement")
    return <span className="text-blue-600 font-medium">Téléversement…</span>;
  if (statut === "televerse")
    return (
      <span className="font-medium text-confidence-high">Téléversé ✓</span>
    );
  return <span className="font-medium text-red-600">Erreur</span>;
}

export default function DossierDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichiers, setFichiers] = useState<FichierLocal[]>([]);
  const [refus, setRefus] = useState<string[]>([]);

  const modeReel = IS_UUID.test(id);

  const uploadFichier = async (nom: string, file: File) => {
    setFichiers((prev) =>
      prev.map((f) =>
        f.nom === nom ? { ...f, statut: "telechargement" } : f
      )
    );
    try {
      const { uploadDocument } = await import("@/lib/supabase/client");
      const { classifierDocument } = await import("@/lib/document-classifier");
      const categorie = classifierDocument(nom);
      await uploadDocument(id, file, categorie);
      setFichiers((prev) =>
        prev.map((f) => (f.nom === nom ? { ...f, statut: "televerse" } : f))
      );
    } catch (err) {
      console.warn(`[documents] Upload échoué pour ${nom} :`, err);
      setFichiers((prev) =>
        prev.map((f) => (f.nom === nom ? { ...f, statut: "erreur" } : f))
      );
    }
  };

  const handleSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const tous = Array.from(event.target.files ?? []);
    const trop_lourds = tous.filter((f) => f.size > TAILLE_MAX_OCTETS);
    const acceptes = tous.filter((f) => f.size <= TAILLE_MAX_OCTETS);

    if (trop_lourds.length > 0) {
      setRefus(trop_lourds.map((f) => f.name));
    } else {
      setRefus([]);
    }

    const nouveaux: FichierLocal[] = acceptes.map((f) => ({
      nom: f.name,
      taille: f.size,
      type: f.type || "inconnu",
      statut: "attente",
      file: f,
    }));

    setFichiers((prev) => {
      const nomsExistants = new Set(prev.map((f) => f.nom));
      const filtres = nouveaux.filter((f) => !nomsExistants.has(f.nom));
      if (modeReel) {
        filtres.forEach((f) => uploadFichier(f.nom, f.file));
      }
      return [...prev, ...filtres];
    });

    event.target.value = "";
  };

  const retirerFichier = (nom: string) => {
    const fichier = fichiers.find((f) => f.nom === nom);
    if (fichier?.statut === "televerse") {
      console.warn(
        `[documents] Fichier "${nom}" retiré de la liste mais toujours présent dans Supabase Storage.`
      );
    }
    setFichiers((prev) => prev.filter((f) => f.nom !== nom));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DossierStepper id={id} />

      <div className="space-y-3">
        <p className="text-sm font-medium text-navy-700">Dossier {id}</p>
        <h1 className="text-4xl font-bold text-navy-900">
          Documents du dossier
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          {modeReel
            ? "Déposez les pièces du dossier. Les fichiers sont enregistrés sur le serveur pour préparer l'audit."
            : "Déposez les pièces du dossier pour préparer l'audit documentaire. Les fichiers restent locaux : aucun envoi serveur dans cette étape."}
        </p>
      </div>

      <section
        className="rounded-lg border-2 border-dashed border-border bg-gray-50 p-10 text-center space-y-4 cursor-pointer hover:border-navy-700 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-lg font-semibold text-navy-900">
          Sélectionner des documents
        </p>
        <p className="text-sm text-muted-foreground">
          PDF, Word, Excel et images acceptés — plusieurs fichiers possibles —
          10 Mo max par fichier.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleSelection}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Choisir des fichiers
        </button>
      </section>

      {refus.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-medium">
            Fichier{refus.length > 1 ? "s" : ""} ignoré{refus.length > 1 ? "s" : ""} (dépassent 10 Mo) :
          </p>
          <ul className="mt-1 list-disc list-inside">
            {refus.map((nom) => (
              <li key={nom}>{nom}</li>
            ))}
          </ul>
        </div>
      )}

      {fichiers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-navy-900">
            Fichiers sélectionnés ({fichiers.length})
          </h2>
          <ul className="space-y-2">
            {fichiers.map((fichier) => (
              <li
                key={fichier.nom}
                className="flex items-center justify-between rounded-lg border border-border bg-white px-5 py-4"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium text-navy-900">
                    {fichier.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTaille(fichier.taille)} &middot; {fichier.type}{" "}
                    &middot; <BadgeStatut statut={fichier.statut} />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => retirerFichier(fichier.nom)}
                  className="ml-4 shrink-0 text-sm text-muted-foreground hover:text-red-600 transition-colors"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/dossiers/${id}/audit`} className="btn-primary">
          Continuer vers l&apos;audit
        </Link>
        {fichiers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Vous pouvez continuer sans document pour explorer le parcours.
          </p>
        )}
      </div>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="text-xl font-semibold text-navy-900">
            Pièces attendues à ce stade
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {expectedDocuments.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="text-xl font-semibold text-navy-900">
            Ce que le moteur analysera ensuite
          </h2>
          <p className="text-sm text-muted-foreground">
            Bail, Kbis, bilans, contrats, bulletins, pièces fiscales et
            compromis s&apos;il existe, pour produire une classification, une
            checklist et des points d&apos;attention.
          </p>
        </div>
      </section>
    </div>
  );
}
