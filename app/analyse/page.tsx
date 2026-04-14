"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { getDocuments } from "@/lib/supabase/client";
import type { Document } from "@/lib/types";

type AnalysisStatus = "idle" | "loading" | "success" | "error";

function AnalyseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cessionId = searchParams.get("cession_id");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [analysisStatus, setAnalysisStatus] =
    useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cessionId) {
      setLoadingDocs(false);
      return;
    }

    const loadDocuments = async () => {
      try {
        const docs = await getDocuments(cessionId);
        setDocuments(docs as Document[]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des documents"
        );
      } finally {
        setLoadingDocs(false);
      }
    };

    void loadDocuments();
  }, [cessionId]);

  const handleAnalyse = async () => {
    if (!cessionId) {
      setError("Session introuvable");
      return;
    }

    setAnalysisStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cession_id: cessionId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Erreur inconnue");
      }

      setAnalysisStatus("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur pendant l’analyse"
      );
      setAnalysisStatus("error");
    }
  };

  if (!cessionId) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">Session non trouvée</p>
          <p className="mt-1 text-sm text-red-700">
            Veuillez recommencer depuis la page d’upload.
          </p>
          <button
            type="button"
            onClick={() => router.push("/upload")}
            className="btn-secondary mt-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l’upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100">
          <span className="font-semibold text-navy-700">3</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Analyse IA</h1>
          <p className="text-muted-foreground">
            L’étape suivante consistera à extraire les informations clés des
            documents téléchargés.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">
          Documents uploadés
        </h2>

        {loadingDocs ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Chargement des documents…</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-yellow-800">
              Aucun document trouvé pour cette session.
            </p>
            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="btn-secondary mt-3 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l’upload
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-white p-4"
              >
                <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-navy-900">{doc.nom_fichier}</p>
                  <p className="text-xs text-muted-foreground">
                    {(doc.taille_octets / 1024 / 1024).toFixed(2)} MB
                    {doc.type_document ? ` · ${doc.type_document}` : ""}
                  </p>
                </div>
                {doc.analyse_effectuee && (
                  <CheckCircle className="h-5 w-5 text-confidence-high" />
                )}
              </div>
            ))}
          </div>
        )}
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

      {analysisStatus === "success" && (
        <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
          <p className="text-sm font-medium text-green-800">
            Analyse terminée. L’étape suivante sera l’affichage des données
            extraites et leur validation.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleAnalyse}
        disabled={
          loadingDocs ||
          documents.length === 0 ||
          analysisStatus === "loading" ||
          analysisStatus === "success"
        }
        className="btn-primary flex items-center gap-2"
      >
        {analysisStatus === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyse en cours…
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            Lancer l’analyse IA
          </>
        )}
      </button>

      <div className="disclaimer">
        <strong>Information :</strong> à ce stade, la page prépare le flux
        d’analyse. La route API `/api/analyse` devra être branchée à l’étape
        suivante.
      </div>
    </div>
  );
}

export default function AnalysePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-4xl items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Chargement…</span>
        </div>
      }
    >
      <AnalyseContent />
    </Suspense>
  );
}
