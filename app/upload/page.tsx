"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, Loader2, X } from "lucide-react";
import { createCession, uploadDocument } from "@/lib/supabase";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [cessionId, setCessionId] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // Créer une nouvelle cession au chargement
  const initializeCession = useCallback(async () => {
    try {
      const newCession = await createCession();
      setCessionId(newCession.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création de la session"
      );
    }
  }, []);

  // Initialiser au montage
  useEffect(() => {
    initializeCession();
  }, [initializeCession]);

  // Validation des fichiers
  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Seuls les PDFs sont acceptés";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Fichier trop volumineux (max 10 MB)";
    }
    return null;
  };

  // Gestion du drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (!consent) {
        setError("Veuillez accepter les conditions RGPD avant de télécharger");
        return;
      }
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [consent]
  );

  // Gestion des fichiers sélectionnés
  const handleFiles = (newFiles: File[]) => {
    const validFiles: UploadedFile[] = [];
    newFiles.forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(`${file.name}: ${validationError}`);
        return;
      }
      validFiles.push({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        status: "pending",
      });
    });
    setFiles((prev) => [...prev, ...validFiles]);
  };

  // Gestion du click sur l'input file
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  // Upload des fichiers
  const uploadFiles = async () => {
    if (!cessionId) {
      setError("Session non initialisée");
      return;
    }
    if (files.filter((f) => f.status === "pending").length === 0) {
      setError("Aucun fichier à télécharger");
      return;
    }

    setIsLoading(true);
    setError(null);

    for (const file of files) {
      if (file.status !== "pending") continue;

      // Ici on simule l'upload (à remplacer plus tard par le vrai upload)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "uploading" } : f
        )
      );

      try {
        // Simulation pour l'instant (on remplacera par uploadDocument plus tard)
        await new Promise((resolve) => setTimeout(resolve, 800));

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success" } : f
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur d'upload";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error", error: errorMsg } : f
          )
        );
      }
    }
    setIsLoading(false);
  };

  // Continuer vers l'analyse
  const handleContinueToAnalysis = () => {
    if (!cessionId) return;
    const successFiles = files.filter((f) => f.status === "success");
    if (successFiles.length === 0) {
      setError("Veuillez télécharger au moins un fichier avec succès");
      return;
    }
    router.push(`/analyse?cession_id=${cessionId}`);
  };

  // Supprimer un fichier
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
            <span className="text-navy-700 font-semibold">2</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-navy-900">
              Téléchargez vos documents
            </h1>
            <p className="text-muted-foreground">
              Uploadez vos PDFs (Kbis, bail, bilans, etc.). L'IA les analysera automatiquement.
            </p>
          </div>
        </div>
      </div>

      {/* RGPD Consent */}
      <div className="disclaimer">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            <strong>RGPD & Confidentialité :</strong> Je comprends que mes documents seront analysés par l'IA Claude et stockés temporairement sur les serveurs Supabase (chiffrés). Je peux les supprimer à tout moment.
          </span>
        </label>
      </div>

      {/* Zone de dépôt */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging ? "border-navy-700 bg-navy-50" : "border-border bg-gray-50 hover:border-navy-700 hover:bg-navy-50"
        } ${!consent ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border border-border">
            <Upload className="w-8 h-8 text-navy-700" />
          </div>
          <div>
            <p className="text-lg font-semibold text-navy-900 mb-2">
              Déposez vos PDFs ici
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou cliquez pour sélectionner des fichiers
            </p>
            <p className="text-xs text-muted-foreground">
              PDF uniquement • Max 10 MB par fichier
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
            <button
              disabled={!consent || isLoading}
              className="btn-secondary"
            >
              Sélectionner des fichiers
            </button>
          </label>
        </div>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Erreur</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">
              Fichiers ({files.length})
            </h2>
            {successCount > 0 && (
              <span className="text-sm text-confidence-high font-medium">
                ✓ {successCount} uploadé{successCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-4 bg-white border border-border rounded-lg hover:border-navy-700 transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-900 truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {file.status === "pending" && <span className="text-xs px-2 py-1 bg-gray-100 text-muted-foreground rounded">En attente</span>}
                {file.status === "uploading" && <Loader2 className="w-5 h-5 text-navy-700 animate-spin flex-shrink-0" />}
                {file.status === "success" && <span className="text-xs px-2 py-1 bg-confidence-high/10 text-confidence-high rounded font-medium">✓ Uploadé</span>}
                {file.status === "error" && <span className="text-xs text-confidence-low">{file.error}</span>}

                <button
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === "uploading"}
                  className="p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={uploadFiles}
          disabled={!consent || isLoading || files.filter((f) => f.status === "pending").length === 0}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "Téléchargement en cours..." : "Télécharger les fichiers"}
        </button>

        <button
          onClick={handleContinueToAnalysis}
          disabled={successCount === 0}
          className="btn-secondary flex-1"
        >
          Continuer vers l'analyse
        </button>
      </div>

      {/* Documents recommandés */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="font-semibold text-blue-900">📋 Documents recommandés</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Extrait KBIS du fonds (moins de 3 mois)</li>
          <li>✓ Bail commercial</li>
          <li>✓ 3 derniers bilans comptables</li>
          <li>✓ Statuts de la société</li>
        </ul>
      </div>
    </div>
  );
}
