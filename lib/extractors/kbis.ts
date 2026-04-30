import type { ChampExtrait, ExtractionKbis, NiveauConfiance } from "./types";

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
  // SIREN avec label explicite (fiabilité haute)
  const labelled = text.match(
    /(?:SIREN|N°\s*SIREN|RCS)[^\d]*(\d{3}[\s.]?\d{3}[\s.]?\d{3})/i
  );
  if (labelled) {
    const siren = labelled[1].replace(/[\s.]/g, "");
    return champ(siren, "haute", labelled[0].trim());
  }
  // Séquence de 9 chiffres isolée (fiabilité faible — peut être un code postal + autre)
  const bare = text.match(/\b(\d{9})\b/);
  if (bare) return champ(bare[1], "faible", bare[0]);
  return vide();
}

function extractCapital(text: string): ChampExtrait<number> {
  // "Capital : 10 000 €" ou "Capital social : 10 000,00 €"
  const m = text.match(/[Cc]apital(?:\s+social)?\s*:\s*([\d\s,.]+)\s*€/);
  if (m) {
    const val = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(val) && val > 0) return champ(val, "haute", m[0].trim());
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
  const m = text.match(/[Ff]orme\s+juridique\s*:\s*([^\n]{3,60})/);
  if (m) return champ(m[1].trim(), "moyenne", m[0].trim());
  return vide();
}

function extractDenomination(text: string): ChampExtrait {
  const patterns = [
    /[Dd]énomination\s+(?:sociale\s*)?:\s*([^\n]{3,80})/,
    /[Nn]om\s+commercial\s*:\s*([^\n]{3,80})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "moyenne", m[0].trim());
  }
  return vide();
}

function extractAdresse(text: string): ChampExtrait {
  const patterns = [
    /[Ss]iège\s+social\s*:\s*([^\n]{5,120})/,
    /[Aa]dresse\s+du\s+siège\s*:\s*([^\n]{5,120})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "faible", m[0].trim());
  }
  return vide();
}

function extractDirigeant(text: string): ChampExtrait {
  const patterns = [
    /[Gg]érant\s*:\s*([^\n]{3,80})/,
    /[Pp]résident\s*:\s*([^\n]{3,80})/,
    /[Dd]irecteur\s+général\s*:\s*([^\n]{3,80})/,
    /[Aa]dministrateur(?:\s+unique)?\s*:\s*([^\n]{3,80})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "moyenne", m[0].trim());
  }
  return vide();
}

function extractActivite(text: string): ChampExtrait {
  const patterns = [
    /[Aa]ctivité\s+principale\s+exercée\s*:\s*([^\n]{5,150})/,
    /[Aa]ctivité\s*:\s*([^\n]{5,150})/,
    /[Oo]bjet\s+(?:social\s*)?:\s*([^\n]{5,150})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "faible", m[0].trim());
  }
  return vide();
}

function extractDateImmatriculation(text: string): ChampExtrait {
  const patterns = [
    /[Dd]ate\s+d.immatricul[a-zé]+\s*:\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
    /[Ii]mmatricul[a-zé]+\s+le\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "haute", m[0].trim());
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
