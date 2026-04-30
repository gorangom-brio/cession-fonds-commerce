import type { ChampExtrait, ExtractionBail, NiveauConfiance } from "./types";
import { parseMonetaire } from "./helpers";

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

function extractBailleur(text: string): ChampExtrait {
  const patterns = [
    /[Bb]ailleur\s*:\s*([^\n]{5,100})/,
    /[Ll]e\s+[Bb]ailleur\s*[,:]?\s*([^\n]{5,100})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "faible", m[0].trim());
  }
  return vide();
}

function extractPreneur(text: string): ChampExtrait {
  const patterns = [
    /[Pp]reneur\s*:\s*([^\n]{5,100})/,
    /[Ll]e\s+[Pp]reneur\s*[,:]?\s*([^\n]{5,100})/,
    /[Ll]ocataire\s*:\s*([^\n]{5,100})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "faible", m[0].trim());
  }
  return vide();
}

function extractAdresseLocaux(text: string): ChampExtrait {
  const patterns = [
    /[Dd]ésignation\s+des\s+locaux\s*:\s*([^\n]{5,150})/,
    /[Ll]ocaux\s+(?:situés?\s+)?(?:à\s+)?([^\n]{5,150})/,
    /[Pp]remises\s+(?:sises?\s+)?(?:à\s+)?([^\n]{5,150})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "faible", m[0].trim());
  }
  return vide();
}

function extractDateDebut(text: string): ChampExtrait {
  const patterns = [
    /[Pp]rise\s+d.effet\s+(?:le\s+)?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
    /[Ee]ntrée\s+en\s+jouissance\s+(?:le\s+)?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
    /[Cc]ommence(?:ment)?\s+(?:le\s+)?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
    /[Dd]ate\s+de\s+(?:début|prise\s+d.effet)\s*:\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "moyenne", m[0].trim());
  }
  return vide();
}

function extractDuree(text: string): ChampExtrait<number> {
  // Durée en lettres : "neuf ans" (bail 3-6-9 standard)
  const motsMap: Record<string, number> = {
    neuf: 9, douze: 12, six: 6, trois: 3, quinze: 15,
  };
  const motsMatch = text.match(
    /[Dd]urée\s+de\s+(neuf|douze|six|trois|quinze)\s+ans/
  );
  if (motsMatch) {
    const val = motsMap[motsMatch[1]];
    return champ(val ?? null, "haute", motsMatch[0]);
  }
  // Durée en chiffres : "durée de 9 ans"
  const chiffresMatch = text.match(/[Dd]urée\s+(?:de\s+)?(\d+)\s+ans/);
  if (chiffresMatch) {
    const val = parseInt(chiffresMatch[1]);
    if (!isNaN(val)) return champ(val, "haute", chiffresMatch[0]);
  }
  // "bail de 9 ans" ou "9 ans à compter"
  const contextMatch = text.match(/(\d+)\s+ans?\s+(?:à\s+compter|à\s+partir|renouvelable)/i);
  if (contextMatch) {
    const val = parseInt(contextMatch[1]);
    if (!isNaN(val)) return champ(val, "moyenne", contextMatch[0]);
  }
  return vide<number>();
}

function extractLoyer(text: string): ChampExtrait<number> {
  // Loyer annuel explicite
  const annuel = text.match(
    /loyer\s+(?:annuel|hors\s+taxes?\s+annuel)[^\d]*([\d\s,\.]+)\s*€/i
  );
  if (annuel) {
    const val = parseMonetaire(annuel[1]);
    if (val !== null && val > 0) return champ(val, "moyenne", annuel[0].trim());
  }
  // Loyer X € par an / HT/an
  const parAn = text.match(
    /loyer[^\d]*([\d\s,\.]+)\s*€\s*(?:hors\s+taxes?\s+)?(?:par\s+an|\/\s*an|HT\s*\/\s*an)/i
  );
  if (parAn) {
    const val = parseMonetaire(parAn[1]);
    if (val !== null && val > 0) return champ(val, "moyenne", parAn[0].trim());
  }
  // Loyer mensuel × 12
  const mensuel = text.match(
    /loyer[^\d]*([\d\s,\.]+)\s*€\s*(?:par\s+mois|\/\s*mois|mensuel)/i
  );
  if (mensuel) {
    const val = parseMonetaire(mensuel[1]);
    if (val !== null && val > 0)
      return champ(val * 12, "faible", mensuel[0].trim() + " (×12)");
  }
  return vide<number>();
}

function extractDepotGarantie(text: string): ChampExtrait<number> {
  const patterns = [
    /dépôt\s+de\s+garantie[^\d]*([\d\s,\.]+)\s*€/i,
    /[Cc]aution[^\d]*([\d\s,\.]+)\s*€/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseMonetaire(m[1]);
      if (val !== null && val > 0) return champ(val, "moyenne", m[0].trim());
    }
  }
  return vide<number>();
}

function extractClauseCession(text: string): ChampExtrait<boolean> {
  const hasCessionBail =
    /cession\s+du\s+(?:bail|droit\s+au\s+bail)|droit\s+au\s+bail/i.test(text);
  const hasAccordBailleur =
    /accord\s+(?:(?:préalable\s+)?du\s+)?bailleur/i.test(text);
  const hasAgrement = /agr[eé]ment\s+(?:du\s+bailleur|préalable)/i.test(text);

  if (hasCessionBail && (hasAccordBailleur || hasAgrement)) {
    return champ(true, "moyenne", "Clause de cession + accord bailleur détectés");
  }
  if (hasCessionBail) {
    return champ(true, "faible", "Mention de cession du bail détectée");
  }
  return vide<boolean>();
}

function extractDestination(text: string): ChampExtrait {
  const patterns = [
    /[Dd]estination\s*:\s*([^\n]{5,150})/,
    /[Aa]ctivité\s+autorisée\s*:\s*([^\n]{5,150})/,
    /[Uu]sage\s*:\s*([^\n]{5,150})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return champ(m[1].trim(), "faible", m[0].trim());
  }
  return vide();
}

export function extraireBail(text: string): ExtractionBail {
  return {
    type: "bail_commercial",
    bailleur: extractBailleur(text),
    preneur: extractPreneur(text),
    adresse_locaux: extractAdresseLocaux(text),
    date_debut: extractDateDebut(text),
    duree_annees: extractDuree(text),
    loyer_annuel: extractLoyer(text),
    depot_garantie: extractDepotGarantie(text),
    clause_cession_presente: extractClauseCession(text),
    destination_locaux: extractDestination(text),
  };
}
