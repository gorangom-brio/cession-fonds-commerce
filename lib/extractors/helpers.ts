/**
 * Parsing d'un montant en format français.
 * Gère : espaces milliers, point milliers, virgule décimale, parenthèses comptables.
 * "1 234 567,89" → 1234567.89
 * "10.000,00"    → 10000        (point = séparateur milliers en France)
 * "(12 450)"     → -12450       (convention comptable française pour les négatifs)
 */
export function parseMonetaire(raw: string): number | null {
  const t = raw.trim();
  const negatif = t.startsWith("(") && t.endsWith(")");
  const nettoye = t
    .replace(/[()]/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")  // points = séparateurs de milliers
    .replace(",", ".");   // virgule décimale → point JS
  const val = parseFloat(nettoye);
  return isNaN(val) ? null : negatif ? -val : val;
}

/**
 * Extrait le premier montant au format français strict d'une ligne.
 * Utilise un format rigoureux (séparateur milliers = UN espace entre groupes de 3)
 * pour ne pas fusionner deux colonnes adjacentes d'un tableau comparatif.
 *
 * Reconnaît :
 *   "487 320"         "1 234 567,89"    "(12 450)"
 * Ne reconnaît pas (volontairement) :
 *   "487 320   412 180"  → retourne seulement 487320
 */
export function extractPremierMontant(ligne: string): number | null {
  const m = ligne.match(
    /(\(\d{1,3}(?:\s\d{3})*(?:,\d{1,2})?\)|-?\d{1,3}(?:\s\d{3})*(?:,\d{1,2})?)/
  );
  return m ? parseMonetaire(m[1]) : null;
}

/**
 * Cherche une valeur texte après un label, sur la même ligne ou la suivante.
 *
 * Formats gérés :
 *   "Label : valeur"          (même ligne, avec deux-points)
 *   "Label: valeur"           (même ligne, sans espace avant deux-points)
 *   "Label\nvaleur"           (valeur sur la ligne suivante, sans deux-points)
 *   "Label :\nvaleur"         (deux-points + saut de ligne)
 *
 * @param text     Texte complet du document extrait
 * @param labelRe  Expression régulière du label (sans groupe capturant)
 * @param maxLen   Longueur maximale de la valeur capturée (défaut 120)
 */
export function findAfterLabel(
  text: string,
  labelRe: RegExp,
  maxLen = 120
): { valeur: string; source: string } | null {
  const flags = labelRe.flags.replace("g", "");

  // Tentative 1 : même ligne — "Label : valeur"
  const reSL = new RegExp(
    labelRe.source + `\\s*:?\\s*([^\\n]{2,${maxLen}})`,
    flags
  );
  const mSL = text.match(reSL);
  const valSL = mSL?.[1]?.trim() ?? "";
  if (valSL.length >= 2) {
    return { valeur: valSL, source: mSL![0].slice(0, 100) };
  }

  // Tentative 2 : ligne suivante — "Label :\nvaleur"
  const reNL = new RegExp(
    labelRe.source + `\\s*:?\\s*\\n\\s*([^\\n]{2,${maxLen}})`,
    flags
  );
  const mNL = text.match(reNL);
  const valNL = mNL?.[1]?.trim() ?? "";
  if (valNL.length >= 2) {
    return { valeur: valNL, source: mNL![0].slice(0, 100) };
  }

  return null;
}

/**
 * Cherche une date au format JJ/MM/AAAA (ou JJ.MM.AAAA, JJ-MM-AAAA)
 * après un label, sur la même ligne ou la suivante.
 */
export function findDateAfterLabel(
  text: string,
  labelRe: RegExp
): { valeur: string; source: string } | null {
  const DATE = "(\\d{1,2}[/\\.\\-]\\d{1,2}[/\\.\\-]\\d{4})";
  const flags = labelRe.flags.replace("g", "");

  const reSL = new RegExp(labelRe.source + "\\s*:?\\s*" + DATE, flags);
  const mSL = text.match(reSL);
  if (mSL?.[1]) return { valeur: mSL[1], source: mSL[0].slice(0, 100) };

  const reNL = new RegExp(labelRe.source + "\\s*:?\\s*\\n\\s*" + DATE, flags);
  const mNL = text.match(reNL);
  if (mNL?.[1]) return { valeur: mNL[1], source: mNL[0].slice(0, 100) };

  return null;
}
