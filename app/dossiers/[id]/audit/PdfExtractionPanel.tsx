"use client";

import { useState } from "react";
import { getDocumentLabel } from "@/lib/document-labels";

type DocResult = {
  document_id: string;
  nom_fichier: string;
  type_document: string | null;
  nb_caracteres_extraits: number;
  extrait: string | null;
  extraction_ok: boolean;
  erreur: string | null;
  message: string | null;
};

type ApiResult = {
  cession_id: string;
  documents: DocResult[];
  messages?: string[];
  error?: string;
};

type Status = "idle" | "loading" | "done" | "error";

function StatutBadge({ doc }: { doc: DocResult }) {
  if (!doc.extraction_ok && doc.message) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceOrange">
        Non analyse automatiquement
      </span>
    );
  }
  if (!doc.extraction_ok) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceRed">
        Erreur d&apos;extraction
      </span>
    );
  }
  if (doc.nb_caracteres_extraits === 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold confidenceOrange">
        PDF scanne ou non extractible
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
        <p className="text-sm italic text-muted-foreground">
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
      const data = (await res.json()) as ApiResult;

      if (!res.ok) {
        throw new Error(
          data.error ?? `Erreur serveur (${res.status}). Réessayez plus tard.`
        );
      }

      setResult(data);
      setStatus("done");
    } catch (err) {
      setErreurGlobale(
        err instanceof Error
          ? err.message
          : "L'extraction a échoué. Vérifiez que des PDF ont été déposés pour ce dossier."
      );
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
          className="btn-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading"
            ? "Extraction en cours…"
            : "Tester l'extraction PDF"}
        </button>
      </div>

      {status === "error" && erreurGlobale && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {erreurGlobale}
        </div>
      )}

      {status === "done" && result && (
        <>
          {result.messages && result.messages.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              <ul className="list-inside list-disc space-y-1">
                {result.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {result.documents.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              Aucun fichier PDF trouvé pour ce dossier.
            </p>
          ) : (
            <div className="space-y-4">
              {result.documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="space-y-3 rounded-lg border border-border bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-navy-900">
                        {doc.nom_fichier}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {doc.type_document && (
                          <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-inset ring-navy-200">
                            {getDocumentLabel(doc.type_document)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {doc.nb_caracteres_extraits.toLocaleString("fr-FR")}{" "}
                          caractères
                        </span>
                      </div>
                    </div>
                    <StatutBadge doc={doc} />
                  </div>

                  {doc.message && (
                    <p className="text-xs italic text-muted-foreground">
                      {doc.message}
                    </p>
                  )}

                  {doc.extraction_ok && doc.extrait && (
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-gray-50 p-3 text-xs leading-relaxed text-muted-foreground">
                      {doc.extrait}
                    </pre>
                  )}

                  {doc.erreur && (
                    <p className="text-xs text-red-700">{doc.erreur}</p>
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
