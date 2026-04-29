"use client";

import { useState } from "react";
import { getDocumentLabel } from "@/lib/document-labels";

type DocResult = {
  id: string;
  nom_fichier: string;
  type_document: string | null;
  nb_caracteres: number;
  extrait: string | null;
  extraction_ok: boolean;
  erreur: string | null;
};

type ApiResult = {
  cession_id: string;
  documents: DocResult[];
};

type Status = "idle" | "loading" | "done" | "error";

function StatutBadge({ doc }: { doc: DocResult }) {
  if (!doc.extraction_ok) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceRed">
        Erreur d&apos;extraction
      </span>
    );
  }
  if (doc.nb_caracteres === 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceOrange">
        PDF scanné ou non extractible
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceGreen">
      Texte extrait
    </span>
  );
}

export default function PdfExtractionPanel({
  id,
  modeReel,
}: {
  id: string;
  modeReel: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);

  if (!modeReel) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Extraction texte des PDF
        </h2>
        <p className="text-sm text-muted-foreground italic">
          Extraction PDF disponible uniquement pour les dossiers réels.
        </p>
      </section>
    );
  }

  const lancer = async () => {
    setStatus("loading");
    setResult(null);
    setErreurGlobale(null);
    try {
      const res = await fetch(`/api/dossiers/${id}/extract-text`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }
      const data: ApiResult = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setErreurGlobale("L'extraction a échoué. Vérifiez que des PDF ont été déposés pour ce dossier.");
      setStatus("error");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold text-navy-900">
            Extraction texte des PDF
          </h2>
          <p className="text-xs text-muted-foreground">
            Aperçu technique — pas encore une analyse juridique.
          </p>
        </div>
        <button
          type="button"
          onClick={lancer}
          disabled={status === "loading"}
          className="btn-secondary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Extraction en cours…" : "Tester l'extraction PDF"}
        </button>
      </div>

      {status === "error" && erreurGlobale && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {erreurGlobale}
        </div>
      )}

      {status === "done" && result && (
        <>
          {result.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun fichier PDF trouvé pour ce dossier.
            </p>
          ) : (
            <div className="space-y-4">
              {result.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-border bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium text-sm text-navy-900 truncate">
                        {doc.nom_fichier}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {doc.type_document && (
                          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200">
                            {getDocumentLabel(doc.type_document)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {doc.nb_caracteres.toLocaleString("fr-FR")} caractères
                        </span>
                      </div>
                    </div>
                    <StatutBadge doc={doc} />
                  </div>

                  {doc.extraction_ok && doc.extrait && (
                    <pre className="rounded bg-gray-50 border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {doc.extrait}
                    </pre>
                  )}

                  {doc.extraction_ok && doc.nb_caracteres === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Ce PDF ne contient pas de texte sélectionnable. Une version
                      numérique ou un traitement OCR sera nécessaire pour
                      l&apos;analyse.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
