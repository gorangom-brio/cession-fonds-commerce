"use client";

import { type SituationDossier, type AcquereurType } from "@/lib/situation";

type Props = {
  situation: SituationDossier;
  onChange: (s: SituationDossier) => void;
};

type TriVal = boolean | null;

function TriButtons({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (v: TriVal) => void;
}) {
  const choices: { label: string; val: TriVal }[] = [
    { label: "Oui", val: true },
    { label: "Non", val: false },
    { label: "Je ne sais pas encore", val: null },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map(({ label, val }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(val)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
            value !== undefined && value === val
              ? "bg-navy-700 text-white border-navy-700"
              : "bg-white text-navy-700 border-navy-200 hover:border-navy-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const ACQUEREUR_CHOICES: { label: string; val: AcquereurType }[] = [
  { label: "Personne physique", val: "physique" },
  { label: "Société déjà créée", val: "societe_existante" },
  { label: "Société en cours de création", val: "societe_creation" },
  { label: "Je ne sais pas encore", val: null },
];

export default function SituationPanel({ situation, onChange }: Props) {
  function update(patch: Partial<SituationDossier>) {
    onChange({ ...situation, ...patch });
  }

  return (
    <section className="rounded-lg border border-border bg-gray-50 p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-navy-900">
          Quelques questions facultatives pour adapter la checklist à votre situation
        </h2>
        <p className="text-xs text-muted-foreground">
          Ces réponses servent uniquement à adapter l&apos;affichage de la checklist.
          Elles ne remplacent pas l&apos;analyse d&apos;un professionnel.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-800">
            Le fonds a-t-il des salariés ?
          </p>
          <TriButtons
            value={situation.salaries}
            onChange={(v) => update({ salaries: v })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-800">
            Le fonds est-il exploité dans des locaux loués ?
          </p>
          <TriButtons
            value={situation.locaux_loues}
            onChange={(v) => update({ locaux_loues: v })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-800">
            Situation de l&apos;acquéreur
          </p>
          <div className="flex flex-wrap gap-2">
            {ACQUEREUR_CHOICES.map(({ label, val }) => (
              <button
                key={label}
                type="button"
                onClick={() => update({ acquereur_type: val })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  situation.acquereur_type !== undefined &&
                  situation.acquereur_type === val
                    ? "bg-navy-700 text-white border-navy-700"
                    : "bg-white text-navy-700 border-navy-200 hover:border-navy-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-800">
            Le fonds comprend-il une marque, une enseigne ou un nom de domaine déposé ?
          </p>
          <TriButtons
            value={situation.marque_enseigne}
            onChange={(v) => update({ marque_enseigne: v })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-navy-800">
            Le fonds relève-t-il d&apos;une activité réglementée ?
          </p>
          <TriButtons
            value={situation.activite_reglementee}
            onChange={(v) => update({ activite_reglementee: v })}
          />
        </div>
      </div>
    </section>
  );
}
