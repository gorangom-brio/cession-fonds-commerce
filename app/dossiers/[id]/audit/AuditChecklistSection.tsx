"use client";

import { useState, useEffect, useRef } from "react";
import { type SituationDossier } from "@/lib/situation";
import { analyserDocuments, type Statut, type Phase } from "@/lib/audit-rules";
import SituationPanel from "./SituationPanel";

export type DocumentReel = {
  id: string;
  nom_fichier: string;
  taille_octets: number;
  type_document: string | null;
  analyse_effectuee: boolean;
};

type Props = {
  documentsReels: DocumentReel[];
  modeReel: boolean;
  erreurSupabase: boolean;
  initialSituation?: SituationDossier;
};

const DEBOUNCE_MS = 800;

function localStorageKey(dossierId: string) {
  return `situation_dossier_${dossierId}`;
}

function readLocalSituation(dossierId: string): SituationDossier | null {
  try {
    const raw = localStorage.getItem(localStorageKey(dossierId));
    if (!raw) return null;
    return JSON.parse(raw) as SituationDossier;
  } catch {
    return null;
  }
}

function writeLocalSituation(dossierId: string, situation: SituationDossier) {
  try {
    localStorage.setItem(localStorageKey(dossierId), JSON.stringify(situation));
  } catch {
    // localStorage indisponible — silencieux
  }
}

const PHASES: Phase[] = ["demarrage", "audit_complet", "avocat_acte"];

const PHASE_LABELS: Record<Phase, string> = {
  demarrage: "Phase 1 — Démarrage",
  audit_complet: "Phase 2 — Audit complet",
  avocat_acte: "Phase 3 — Avocat & acte",
};

const STATUT_STYLE: Record<Statut, string> = {
  Présent: "confidenceGreen",
  "À vérifier": "confidenceOrange",
  Manquant: "confidenceRed",
  "Le cas échéant": "bg-gray-100 text-gray-500",
};

export default function AuditChecklistSection({
  documentsReels,
  modeReel,
  erreurSupabase,
  initialSituation,
}: Props) {
  // dossierId est encodé dans l'URL — on l'extrait côté client pour localStorage
  const [dossierId, setDossierId] = useState<string>("");
  const [situation, setSituation] = useState<SituationDossier>(
    initialSituation ?? {}
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Récupère l'id du dossier depuis l'URL côté client
  useEffect(() => {
    const segments = window.location.pathname.split("/");
    const id = segments[2] ?? "";
    setDossierId(id);

    // Si pas de situation initiale depuis Supabase, tente le fallback localStorage
    if (!initialSituation && id) {
      const local = readLocalSituation(id);
      if (local) setSituation(local);
    }
  }, [initialSituation]);

  // Sauvegarde silencieuse à chaque changement (sauf au premier rendu)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!dossierId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // Fallback localStorage toujours écrit (mode démo + fallback réseau)
      writeLocalSituation(dossierId, situation);

      // Persistance serveur uniquement en mode réel (V2-37)
      const IS_UUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!IS_UUID.test(dossierId)) return;

      fetch(`/api/dossiers/${dossierId}/situation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(situation),
      })
        .then((res) => {
          if (!res.ok) {
            // Échec silencieux — localStorage sert de fallback
            console.warn(
              `[situation_declaree] Persistance serveur échouée (HTTP ${res.status}).`
            );
          }
        })
        .catch(() => {
          // Échec silencieux — localStorage sert de fallback
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [situation, dossierId]);

  const checklistEffective =
    modeReel && !erreurSupabase
      ? analyserDocuments(documentsReels, situation)
      : analyserDocuments([], situation);

  const presents = checklistEffective.filter((i) => i.statut === "Présent").length;
  const aVerifier = checklistEffective.filter((i) => i.statut === "À vérifier").length;
  const manquants = checklistEffective.filter((i) => i.statut === "Manquant").length;
  const leCasEcheant = checklistEffective.filter((i) => i.statut === "Le cas échéant").length;

  return (
    <>
      {/* Questionnaire de situation */}
      <SituationPanel situation={situation} onChange={setSituation} />

      {/* Synthèse rapide */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-confidence-high">{presents}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Présentes
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-confidence-medium">{aVerifier}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            À vérifier
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-confidence-low">{manquants}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Manquantes
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-5 text-center space-y-1">
          <p className="text-2xl font-bold text-gray-400">{leCasEcheant}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Le cas échéant
          </p>
        </div>
      </section>

      {/* Checklist documentaire — groupée par phase */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy-900">
          Checklist documentaire
        </h2>

        {PHASES.map((phase) => {
          const items = checklistEffective.filter((i) => i.phase === phase);
          if (items.length === 0) return null;
          return (
            <div key={phase}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">
                {PHASE_LABELS[phase]}
              </h3>
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pièce
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.piece}>
                        <td className="px-5 py-4 font-medium text-navy-900">
                          {item.piece}
                          {item.conditionLabel && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              — {item.conditionLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_STYLE[item.statut]}`}
                          >
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">
                          {item.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Documents non classifiés */}
        {checklistEffective.filter((i) => !i.phase).length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">
              À identifier
            </h3>
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Fichier
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Statut
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checklistEffective
                    .filter((i) => !i.phase)
                    .map((item) => (
                      <tr key={item.piece}>
                        <td className="px-5 py-4 font-medium text-navy-900">
                          {item.piece}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_STYLE[item.statut]}`}
                          >
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">
                          {item.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          Liste indicative à adapter selon la situation du fonds et à valider avec un professionnel.
        </p>
      </section>

      {/* Synthèse provisoire */}
      <section className="rounded-lg border border-border bg-gray-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-navy-900">
          Synthèse provisoire
        </h2>
        <p className="text-sm text-muted-foreground">
          Le dossier présente {presents} pièce{presents > 1 ? "s" : ""} validée
          {presents > 1 ? "s" : ""}, {aVerifier} à vérifier et {manquants}{" "}
          manquante{manquants > 1 ? "s" : ""}. Plusieurs points structurants
          restent à confirmer avant de pouvoir transmettre le dossier à un
          professionnel. Un rapport d&apos;audit structuré peut être généré dès
          maintenant pour servir de base de travail.
        </p>
        <p className="text-xs text-muted-foreground">
          {modeReel
            ? "Statuts calculés à partir des types de documents détectés — l'analyse du contenu sera disponible dans une prochaine version."
            : "Mode démo — les statuts reflètent une cession sans aucun document déposé."}
        </p>
      </section>
    </>
  );
}
