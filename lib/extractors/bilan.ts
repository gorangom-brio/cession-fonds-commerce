import type { ChampExtrait, ExtractionBilan, NiveauConfiance } from "./types";

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

// Nettoie une chaîne numérique française : "1 234 567,89" → 1234567.89
function parseEuros(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function extractExercice(text: string): ChampExtrait<number> {
  // "Exercice clos le 31/12/2023" ou "Exercice 2023"
  const labelled = text.match(
    /[Ee]xercice\s+(?:clos\s+(?:le\s+)?(?:\d{1,2}[\/\-]\d{1,2}[\/\-])?)?(20\d{2})/
  );
  if (labelled) return champ(parseInt(labelled[1]), "haute", labelled[0].trim());

  // Date de clôture "31/12/2023"
  const dateCloture = text.match(/31[\/\-]12[\/\-](20\d{2})/);
  if (dateCloture) return champ(parseInt(dateCloture[1]), "haute", dateCloture[0]);

  // Année isolée la plus récente dans la plage vraisemblable
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
  const patterns = [
    /[Cc]hiffre\s+d.affaires\s+net\b[^\d-]*([\d\s,\.]+)/,
    /[Cc]hiffre\s+d.affaires\b[^\d-]*([\d\s,\.]+)/,
    /\bCA\s+net\b[^\d-]*([\d\s,\.]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseEuros(m[1]);
      if (val !== null && val > 0) return champ(val, "moyenne", m[0].trim());
    }
  }
  return vide<number>();
}

function extractResultatNet(text: string): ChampExtrait<number> {
  const patterns = [
    /[Rr]ésultat\s+de\s+l.exercice\b[^\d-]*([-\d\s,\.]+)/,
    /[Rr]ésultat\s+net\b[^\d-]*([-\d\s,\.]+)/,
    /RÉSULTAT\s+NET\b[^\d-]*([-\d\s,\.]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseEuros(m[1]);
      if (val !== null) return champ(val, "moyenne", m[0].trim());
    }
  }
  return vide<number>();
}

function extractCapitauxPropres(text: string): ChampExtrait<number> {
  const patterns = [
    /[Cc]apitaux\s+propres\b[^\d-]*([\d\s,\.]+)/,
    /CAPITAUX\s+PROPRES\b[^\d-]*([\d\s,\.]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseEuros(m[1]);
      if (val !== null && val > 0) return champ(val, "faible", m[0].trim());
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
