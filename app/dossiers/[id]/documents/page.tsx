"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import DossierStepper from "../DossierStepper";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 10;
const MAX_BATCH_SIZE_BYTES = 30 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx"]);

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

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

function estExtensionAutorisee(fileName: string): boolean {
  return ACCEPTED_EXTENSIONS.has(getExtension(fileName));
}

function BadgeStatut({ statut }: { statut: StatutFichier }) {
  if (statut === "attente")
    return <span className="text-muted-foreground">En attente…</span>;
  if (statut === "telechargement")
    return <span className="font-medium text-blue-600">Téléversement…</span>;
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
  const [messageRefus, setMessageRefus] = useState<string | null>(null);

  const modeReel = IS_UUID.test(id);

  const uploadFichier = async (nom: string, file: File) => {
    setFichiers((prev) =>
      prev.map((f) =>
        f.nom === nom ? { ...f, statut: "telechargement" } : f
      )
    );
    try {
      // 1. Préparation côté serveur — la route génère storage_path,
      //    classifie le document et crée une ligne pending en base.
      const prepareRes = await fetch(
        `/api/dossiers/${id}/documents/prepare-upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom_fichier: file.name,
            taille_octets: file.size,
            mime_type: file.type || null,
          }),
        }
      );

      if (!prepareRes.ok) {
        let detail = "";
        try {
          const j = (await prepareRes.json()) as { error?: string };
          detail = j.error ?? "";
        } catch {
          // payload non JSON — on ignore
        }
        throw new Error(
          `prepare HTTP ${prepareRes.status}${detail ? " — " + detail : ""}`
        );
      }

      const prepared = (await prepareRes.json()) as {
        upload_id?: string;
        signed_url?: string;
        token?: string;
        storage_path?: string;
      };

      if (
        !prepared.upload_id ||
        !prepared.signed_url ||
        !prepared.token ||
        !prepared.storage_path
      ) {
        throw new Error("prepare réponse incomplète");
      }

      // 2. Upload direct vers Supabase Storage via signed URL (pas de clé anon).
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const { error: uploadError } = await getSupabaseClient()
        .storage.from("documents")
        .uploadToSignedUrl(prepared.storage_path, prepared.token, file, {
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`upload signed URL : ${uploadError.message}`);
      }

      // 3. Finalisation côté serveur — vérifie l'existence Storage et bascule
      //    la ligne en status='ready'.
      const finalizeRes = await fetch(
        `/api/dossiers/${id}/documents/finalize-upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upload_id: prepared.upload_id }),
        }
      );

      if (!finalizeRes.ok) {
        let detail = "";
        try {
          const j = (await finalizeRes.json()) as { error?: string };
          detail = j.error ?? "";
        } catch {
          // payload non JSON — on ignore
        }
        throw new Error(
          `finalize HTTP ${finalizeRes.status}${detail ? " — " + detail : ""}`
        );
      }

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

  const uploadFichiers = async (items: FichierLocal[]) => {
    for (const item of items) {
      await uploadFichier(item.nom, item.file);
    }
  };

  const handleSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const tous = Array.from(event.target.files ?? []);

    if (tous.length === 0) {
      return;
    }

    if (tous.length > MAX_FILES_PER_BATCH) {
      setMessageRefus(
        `Pour cette démo, limitez chaque sélection à ${MAX_FILES_PER_BATCH} fichiers maximum.`
      );
      setRefus(tous.map((f) => f.name));
      event.target.value = "";
      return;
    }

    const tailleTotale = tous.reduce((total, file) => total + file.size, 0);
    if (tailleTotale > MAX_BATCH_SIZE_BYTES) {
      setMessageRefus(
        "Le lot sélectionné dépasse 30 Mo. Réduisez le nombre de fichiers ou leur taille avant de réessayer."
      );
      setRefus(tous.map((f) => f.name));
      event.target.value = "";
      return;
    }

    const nonPrisEnCharge = tous.filter((f) => !estExtensionAutorisee(f.name));
    const tropLourds = tous.filter(
      (f) => estExtensionAutorisee(f.name) && f.size > MAX_FILE_SIZE_BYTES
    );
    const acceptes = tous.filter(
      (f) => estExtensionAutorisee(f.name) && f.size <= MAX_FILE_SIZE_BYTES
    );

    const nomsExistants = new Set(fichiers.map((f) => f.nom));
    const doublons = acceptes.filter((f) => nomsExistants.has(f.name));
    const nouveaux: FichierLocal[] = acceptes
      .filter((f) => !nomsExistants.has(f.name))
      .map((f) => ({
        nom: f.name,
        taille: f.size,
        type: f.type || "inconnu",
        statut: "attente",
        file: f,
      }));

    const refusCourants = [
      ...nonPrisEnCharge.map((f) => f.name),
      ...tropLourds.map((f) => f.name),
      ...doublons.map((f) => f.name),
    ];

    if (refusCourants.length > 0) {
      setMessageRefus(
        "Certains fichiers n'ont pas été retenus. Utilisez jusqu'à 10 fichiers PDF, Word ou Excel, 10 Mo maximum par fichier et 30 Mo maximum par lot. Les images scannées ne sont pas encore exploitables automatiquement."
      );
      setRefus([...new Set(refusCourants)]);
    } else {
      setMessageRefus(null);
      setRefus([]);
    }

    if (nouveaux.length === 0) {
      event.target.value = "";
      return;
    }

    setFichiers((prev) => [...prev, ...nouveaux]);

    if (modeReel) {
      void uploadFichiers(nouveaux);
    }

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
        className="space-y-4 rounded-lg border-2 border-dashed border-border bg-gray-50 p-10 text-center transition-colors hover:border-navy-700 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-lg font-semibold text-navy-900">
          Sélectionner des documents
        </p>
        <p className="text-sm text-muted-foreground">
          PDF, Word et Excel acceptés — jusqu&apos;à 10 fichiers par sélection
          — 10 Mo max par fichier — 30 Mo max par lot. Les images scannées ne
          sont pas encore lisibles automatiquement.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx"
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

      {messageRefus && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-medium">{messageRefus}</p>
          {refus.length > 0 && (
            <ul className="mt-2 list-inside list-disc">
              {refus.map((nom) => (
                <li key={nom}>{nom}</li>
              ))}
            </ul>
          )}
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
                  className="ml-4 shrink-0 text-sm text-muted-foreground transition-colors hover:text-red-600"
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
        <div className="space-y-4 rounded-lg border border-border bg-white p-6">
          <h2 className="text-xl font-semibold text-navy-900">
            Pièces attendues à ce stade
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {expectedDocuments.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-white p-6">
          <h2 className="text-xl font-semibold text-navy-900">
            Ce que le moteur analysera ensuite
          </h2>
          <p className="text-sm text-muted-foreground">
            Bail, Kbis, bilans, contrats, bulletins, pièces fiscales et
            compromis s&apos;il existe, pour produire une classification, une
            checklist et des points d&apos;attention. Les images scannées
            devront être converties en documents exploitables ou vérifiées
            manuellement.
          </p>
        </div>
      </section>
    </div>
  );
}
