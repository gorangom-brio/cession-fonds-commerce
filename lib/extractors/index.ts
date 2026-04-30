import { extraireKbis } from "./kbis";
import { extraireBilan } from "./bilan";
import { extraireBail } from "./bail";
import type { ExtractionResultat } from "./types";

const TYPES_SUPPORTES = new Set(["kbis", "bilans_comptes_annuels", "bail_commercial"]);

// Seuil minimal de caractères pour tenter une extraction structurée
const MIN_CHARS = 100;

export function extraire(
  typeDocument: string | null,
  text: string
): ExtractionResultat {
  const type = typeDocument ?? "inconnu";

  if (!text || text.trim().length === 0) {
    return { type, non_extractible: true, raison: "pdf_scanne" };
  }

  if (text.trim().length < MIN_CHARS) {
    return { type, non_extractible: true, raison: "texte_insuffisant" };
  }

  if (!TYPES_SUPPORTES.has(type)) {
    return { type, non_extractible: true, raison: "type_non_supporte" };
  }

  switch (type) {
    case "kbis":
      return extraireKbis(text);
    case "bilans_comptes_annuels":
      return extraireBilan(text);
    case "bail_commercial":
      return extraireBail(text);
    default:
      return { type, non_extractible: true, raison: "type_non_supporte" };
  }
}
