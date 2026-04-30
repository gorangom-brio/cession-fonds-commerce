import type { ChampExtrait, ExtractionKbis, NiveauConfiance } from "./types";
import {
  findAfterLabel,
  findDateAfterLabel,
  extractPremierMontant,
  parseMonetaire,
} from "./helpers";

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

function extractSiren(text: string): ChampExtrait {
  const labelled = text.match(
    /(?:SIREN|N°\s*SIREN|RCS)[^\d]*(\d{3}[\s.]?\d{3}[\s.]?\d{3})/i
  );
  if (labelled) {
    const siren = labelled[1].replace(/[\s.]/g, "");
    return champ(siren, "haute", labelled[0].trim());
  }
  const bare = text.match(/\b(\d{9})\b/);
  if (bare) return champ(bare[1], "faible", bare[0]);
  return vide();
}

function extractCapital(text: string): ChampExtrait<number> {
  const labels = [
    /[Mm]ontant\s+du\s+capital\s+social/,
    /[Cc]apital\s+social/,
    /[Cc]apital/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 40);
    if (found) {
      const val = extractPremierMontant(found.valeur);
      if (val !== null && val > 0) return champ(val, "haute", found.source);
    }
    // Fallback: inline with explicit € sign
    const m = text.match(
      new RegExp(labelRe.source + "\\s*:?\\s*([\\d\\s,.]+)\\s*€", "i")
    );
    if (m) {
      const val = parseMonetaire(m[1]);
      if (val !== null && val > 0)
        return champ(val, "haute", m[0].trim().slice(0, 100));
    }
  }
  return vide<number>();
}

function extractFormeJuridique(text: string): ChampExtrait {
  const formes = [
    "SARL", "SASU", "SAS", "EURL", "SA", "SNC", "SCI",
    "SELARL", "SELAS", "GIE", "EIRL",
  ];
  for (const forme of formes) {
    if (new RegExp(`\\b${forme}\\b`).test(text)) {
      return champ(forme, "haute", forme);
    }
  }
  const found = findAfterLabel(text, /[Ff]orme\s+juridique/, 60);
  if (found) return champ(found.valeur, "moyenne", found.source);
  return vide();
}

function extractDenomination(text: string): ChampExtrait {
  const labels = [
    /[Dd]énomination\s+ou\s+raison\s+sociale/,
    /[Rr]aison\s+sociale/,
    /[Dd]énomination\s+sociale/,
    /[Dd]énomination/,
    /[Nn]om\s+commercial/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 80);
    if (found) return champ(found.valeur, "moyenne", found.source);
  }
  return vide();
}

function extractAdresse(text: string): ChampExtrait {
  const labels = [
    /[Aa]dresse\s+du\s+siège\s+social/,
    /[Aa]dresse\s+du\s+siège/,
    /[Ss]iège\s+social/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 120);
    if (found) return champ(found.valeur, "faible", found.source);
  }
  return vide();
}

function extractDirigeant(text: string): ChampExtrait {
  const labels = [
    /[Gg]érant/,
    /[Pp]résident/,
    /[Dd]irecteur\s+général/,
    /[Aa]dministrateur(?:\s+unique)?/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 80);
    if (found) return champ(found.valeur, "moyenne", found.source);
  }
  return vide();
}

function extractActivite(text: string): ChampExtrait {
  const labels = [
    /[Aa]ctivités?\s+principales?\s+exercées?/,
    /[Aa]ctivité\(s\)\s+exercée\(s\)/,
    /[Aa]ctivité\s+principale\s+exercée/,
    /[Aa]ctivités?\s+principales?/,
    /[Aa]ctivité/,
    /[Oo]bjet\s+(?:social)?/,
  ];
  for (const labelRe of labels) {
    const found = findAfterLabel(text, labelRe, 150);
    if (found) return champ(found.valeur, "faible", found.source);
  }
  return vide();
}

function extractDateImmatriculation(text: string): ChampExtrait {
  const labels = [
    /[Dd]ate\s+d.immatricul[a-zé]+/,
    /[Ii]mmatricul[a-zé]+\s+le/,
  ];
  for (const labelRe of labels) {
    const found = findDateAfterLabel(text, labelRe);
    if (found) return champ(found.valeur, "haute", found.source);
  }
  return vide();
}

export function extraireKbis(text: string): ExtractionKbis {
  return {
    type: "kbis",
    denomination: extractDenomination(text),
    forme_juridique: extractFormeJuridique(text),
    capital_social: extractCapital(text),
    siren: extractSiren(text),
    adresse_siege: extractAdresse(text),
    dirigeant: extractDirigeant(text),
    activite: extractActivite(text),
    date_immatriculation: extractDateImmatriculation(text),
  };
}
