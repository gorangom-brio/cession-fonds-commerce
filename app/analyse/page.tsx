"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, FileText, AlertCircle, CheckCircle, Brain, ArrowLeft } from "lucide-react";
import { getDocuments } from "@/lib/supabase";
import type { Document } from "@/lib/types";

type AnalysisStatus = "idle" | "loading" | "success" | "error";

function AnalyseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cessionId = searchParams.get("cession_id");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cessionId) return;
    async function loadDocuments() {
      try {
        const docs = await getDocuments(cessionId!);
        setDocuments(docs as Document[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement");
      } finally {
        setLoadingDocs(false);
      }
    }
    loadDocuments();
  }, [cessionId]);

  const handleAnalyse = async () => {
    setAnalysisStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cession_id: cessionId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error ?? "Erreur inconnue");
      setAnalysisStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'analyse");
      setAnalysisStatus("error");
    }
  };

  if (!cessionId) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-semibold">Session non trouvée.</p>
          <p className="text-red-700 text-sm mt-1">Veuillez recommencer depuis la page d&apos;upload.</p>
          <button onClick={() => router.push("/upload")} className="btn-secondary mt-4 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
          <span className="text-navy-700 font-semibold">3</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Analyse IA</h1>
          <p className="text-muted-foreground">L&apos;IA va extraire les informations clés de vos documents.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Documents uploadés</h2>
        {loadingDocs ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement des documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Aucun document trouvé pour cette session.</p>
            <button onClick={() => router.push("/upload")} className="btn-secondary mt-3 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;upload
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-4 bg-white border border-border rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-navy-900">{doc.nom_fichier}</p>
                  <p className="text-xs text-muted-foreground">
                    {(doc.taille_octets / 1024 / 1024).toFixed(2)} MB
                    {doc.type_document && ` · ${doc.type_document}`}
                  </p>
                </div>
                {doc.analyse_effectuee && <CheckCircle className="w-5 h-5 text-confidence-high flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Erreur</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {analysisStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">Analyse terminée. Vous pouvez vérifier les informations extraites.</p>
        </div>
      )}

      <button
        onClick={handleAnalyse}
        disabled={analysisStatus === "loading" || documents.length === 0 || analysisStatus === "success"}
        className="btn-primary flex items-center gap-2"
      >
        {analysisStatus === "loading" ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Analyse en cours...</>
        ) : (
          <><Brain className="w-4 h-4" />Lancer l&apos;analyse IA</>
        )}
      </button>

      <div className="disclaimer">
        <strong>ℹ️ Comment ça fonctionne :</strong> L&apos;IA analyse chaque document et extrait automatiquement les informations clés (parties, prix, bail...). Vous pourrez ensuite vérifier et corriger chaque champ avant la génération du contrat.
      </div>
    </div>
  );
}

export default function AnalysePage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Chargement...</span>
      </div>
    }>
      <AnalyseContent />
    </Suspense>
  );
}
