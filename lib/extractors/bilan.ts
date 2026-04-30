import type { ChampExtrait, ExtractionBilan, NiveauConfiance } from "./types";
import { findAfterLabel, extractPremierMontant } from "./helpers";

function champ<T>(
  valeur: T | null,
  confiance: NiveauConfiance,
  source?: string
): ChampExtrait<T> {
  return { valeur, confiance, ...(source ? { source: source.slice(0, 100) } : {}) };
}

function vide<T = string>(): ChampExtrait<T> {
  return { valeur: null, confiance: "non_extractible" };
}

function extractExercice(text: string): ChampExtrait<number> {
  const labelled = text.match(
    /[Ee]xercice\s+(?:clos\s+(?:le\s+)?(?:\d{1,2}[\/\-]\d{1,2}[\/\-])?)?(20\d{2})/
  );
  if (labelled) return champ(parseInt(labelled[1]), "haute", labelled[0].trim());

  const dateCloture = text.match(/31[\/\-]12[\/\-](20\d{2})/);
  if (dateCloture) return champ(parseInt(dateCloture[1]), "haute", dateCloture[0]);

  const years = [...text.matchAll(/\b(20\d{2})\b/g)]
    .map((m) => parseInt(m[1]))
    .filter((y) => y >= 2018 && y <= 2026);
  if (years.length > 0) {
    const maxYear = Math.max(...years);
    return champ(maxYear, "faible", String(maxYear));
  }
  return vide<number>();
}

function extractCA(text: string): ChampExtrait<number> {
  const labels = [
    /[Cc]hiffre\s+d.affaires\s+net/,
    /[Cc]hiffre\s+d.affaires/,
    /\bCA\s+net\b/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 60);
    if (found) {
      const val = extractPremierMontant(found.valeur);
      if (val !== null && val > 0) return champ(val, "moyenne", found.source);
    }
  }
  return vide<number>();
}

function extractResultatNet(text: string): ChampExtrait<number> {
  const labels = [
    /[Rr]ésultat\s+de\s+l.exercice/,
    /[Rr]ésultat\s+net/,
    /RÉSULTAT\s+NET/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 60);
    if (found) {
      const val = extractPremierMontant(found.valeur);
      if (val !== null) return champ(val, "moyenne", found.source);
    }
  }
  return vide<number>();
}

function extractCapitauxPropres(text: string): ChampExtrait<number> {
  const labels = [
    /[Cc]apitaux\s+propres/,
    /CAPITAUX\s+PROPRES/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 60);
    if (found) {
      const val = extractPremierMontant(found.valeur);
      if (val !== null && val > 0) return champ(val, "faible", found.source);
    }
  }
  return vide<number>();
}

export function extraireBilan(text: string): ExtractionBilan {
  return {
    type: "bilans_comptes_annuels",
    exercice: extractExercice(text),
    chiffre_affaires: extractCA(text),
    resultat_net: extractResultatNet(text),
    capitaux_propres: extractCapitauxPropres(text),
  };
}
