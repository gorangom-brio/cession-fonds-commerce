      "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Upload, X } from "lucide-react";
import { createCession, uploadDocument } from "@/lib/supabase/client";

type UploadStatus = "pending" | "uploading" | "success" | "error";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();

  const [cessionId, setCessionId] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successCount = useMemo(
    () => files.filter((file) => file.status === "success").length,
    [files]
  );

  const pendingCount = useMemo(
    () => files.filter((file) => file.status === "pending").length,
    [files]
  );

  const initializeCession = useCallback(async () => {
    try {
      const newCession = await createCession();
      setCessionId(newCession.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création de la session"
      );
    }
  }, []);

  useEffect(() => {
    void initializeCession();
  }, [initializeCession]);

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Seuls les fichiers PDF sont acceptés";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "Fichier trop volumineux (10 MB maximum)";
    }

    return null;
  };

  const handleFiles = useCallback((incomingFiles: File[]) => {
    setError(null);

    const validFiles: UploadedFile[] = [];

    for (const file of incomingFiles) {
      const validationError = validateFile(file);

      if (validationError) {
        setError(`${file.name} : ${validationError}`);
        continue;
      }

      validFiles.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        status: "pending",
      });
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (!consent) {
        setError("Veuillez accepter les conditions RGPD avant de télécharger");
        return;
      }

      handleFiles(Array.from(e.dataTransfer.files));
    },
    [consent, handleFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    handleFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const uploadFiles = async () => {
    if (!cessionId) {
      setError("Session non initialisée");
      return;
    }

    const pendingFiles = files.filter((file) => file.status === "pending");

    if (pendingFiles.length === 0) {
      setError("Aucun fichier à télécharger");
      return;
    }

    setIsLoading(true);
    setError(null);

    for (const item of pendingFiles) {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === item.id ? { ...file, status: "uploading" } : file
        )
      );

      try {
        await uploadDocument(cessionId, item.file);

        setFiles((prev) =>
          prev.map((file) =>
            file.id === item.id ? { ...file, status: "success" } : file
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors du téléchargement";

        setFiles((prev) =>
          prev.map((file) =>
            file.id === item.id
              ? { ...file, status: "error", error: message }
              : file
          )
        );
      }
    }

    setIsLoading(false);
  };

  const continueToAnalysis = () => {
    if (!cessionId) {
      setError("Session non initialisée");
      return;
    }

    if (successCount === 0) {
      setError("Veuillez télécharger au moins un fichier avec succès");
      return;
    }

    router.push(`/analyse?cession_id=${cessionId}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100">
            <span className="font-semibold text-navy-700">2</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-navy-900">
              Téléchargez vos documents
            </h1>
            <p className="text-muted-foreground">
              Uploadez vos PDF utiles à la cession. Ils seront ensuite reliés à
              votre dossier.
            </p>
          </div>
        </div>
      </div>

      <div className="disclaimer">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            <strong>RGPD et confidentialité :</strong> je comprends que mes
            documents seront stockés temporairement dans Supabase pour
            traitement, et pourront ensuite être analysés par l’IA côté serveur.
          </span>
        </label>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? "border-navy-700 bg-navy-50"
            : "border-border bg-gray-50 hover:border-navy-700 hover:bg-navy-50"
        } ${!consent ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-white">
            <Upload className="h-8 w-8 text-navy-700" />
          </div>

          <div>
            <p className="mb-2 text-lg font-semibold text-navy-900">
              Déposez vos PDF ici
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              ou cliquez pour sélectionner des fichiers
            </p>
            <p className="text-xs text-muted-foreground">
              PDF uniquement • 10 MB maximum par fichier
            </p>
          </div>

          <label className="inline-block">
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={handleFileInput}
              disabled={!consent || isLoading}
              className="hidden"
            />
            <span className="btn-secondary inline-flex cursor-pointer items-center">
              Sélectionner des fichiers
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Erreur</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">
              Fichiers ({files.length})
            </h2>

            {successCount > 0 && (
              <span className="text-sm font-medium text-confidence-high">
                ✓ {successCount} uploadé{successCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-navy-700"
              >
                <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {file.status === "pending" && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-muted-foreground">
                    En attente
                  </span>
                )}

                {file.status === "uploading" && (
                  <Loader2 className="h-5 w-5 animate-spin text-navy-700" />
                )}

                {file.status === "success" && (
                  <span className="rounded bg-confidence-high/10 px-2 py-1 text-xs font-medium text-confidence-high">
                    ✓ Uploadé
                  </span>
                )}

                {file.status === "error" && (
                  <span className="text-xs text-confidence-low">
                    {file.error}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === "uploading"}
                  className="rounded p-2 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={uploadFiles}
          disabled={!consent || isLoading || pendingCount === 0}
          className="btn-primary flex flex-1 items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Téléchargement en cours..." : "Télécharger les fichiers"}
        </button>

        <button
          type="button"
          onClick={continueToAnalysis}
          disabled={successCount === 0}
          className="btn-secondary flex-1"
        >
          Continuer vers l’analyse
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="font-semibold text-blue-900">Documents recommandés</p>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✓ Extrait Kbis du fonds</li>
          <li>✓ Bail commercial</li>
          <li>✓ Trois derniers bilans</li>
          <li>✓ Statuts de la société</li>
        </ul>
      </div>
    </div>
  );
}
