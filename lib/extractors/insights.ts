import type {
  DocumentExtrait,
  ExtractionBail,
  ExtractionBilan,
  ExtractionKbis,
} from "./types";

export type NiveauConstat = "information" | "attention" | "verification";

export type Constat = {
  niveau: NiveauConstat;
  message: string;
  source?: string;
};

type DocAvecKbis = DocumentExtrait & { extraction: ExtractionKbis };
type DocAvecBilan = DocumentExtrait & { extraction: ExtractionBilan };
type DocAvecBail = DocumentExtrait & { extraction: ExtractionBail };

function isKbis(doc: DocumentExtrait): doc is DocAvecKbis {
  return !("non_extractible" in doc.extraction) && doc.extraction.type === "kbis";
}

function isBilan(doc: DocumentExtrait): doc is DocAvecBilan {
  return (
    !("non_extractible" in doc.extraction) &&
    doc.extraction.type === "bilans_comptes_annuels"
  );
}

function isBail(doc: DocumentExtrait): doc is DocAvecBail {
  return (
    !("non_extractible" in doc.extraction) &&
    doc.extraction.type === "bail_commercial"
  );
}

function formatEuros(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function libelleTypePresent(typeDocument: string | null): string | null {
  if (typeDocument === "kbis") return "Un Kbis";
  if (typeDocument === "bilans_comptes_annuels") return "Un bilan";
  if (typeDocument === "bail_commercial") return "Le bail commercial";
  return null;
}

export function genererConstats(documents: DocumentExtrait[]): Constat[] {
  const constats: Constat[] = [];

  if (documents.length === 0) {
    constats.push({
      niveau: "information",
      message: "Aucun document PDF n'a encore été déposé pour ce dossier.",
    });
    return constats;
  }

  const kbis = documents.filter(isKbis);
  const bilans = documents.filter(isBilan);
  const baux = documents.filter(isBail);

  // ── Kbis ───────────────────────────────────────────────────────────────────
  if (kbis.length > 0) {
    constats.push({
      niveau: "information",
      message:
        kbis.length === 1
          ? "Un Kbis a été détecté parmi les pièces déposées."
          : `${kbis.length} Kbis ont été détectés parmi les pièces déposées.`,
    });

    for (const doc of kbis) {
      const e = doc.extraction;
      if (e.siren.valeur) {
        constats.push({
          niveau: "information",
          message: `Un SIREN a été détecté sur un Kbis : ${e.siren.valeur}.`,
          source: doc.nom_fichier,
        });
      }
      if (
        e.denomination.valeur &&
        (e.denomination.confiance === "haute" ||
          e.denomination.confiance === "moyenne")
      ) {
        constats.push({
          niveau: "information",
          message: `La dénomination sociale détectée semble être : ${e.denomination.valeur}.`,
          source: doc.nom_fichier,
        });
      }
      if (e.capital_social.valeur === null) {
        constats.push({
          niveau: "verification",
          message:
            "Le capital social n'a pas pu être détecté automatiquement sur un Kbis.",
          source: doc.nom_fichier,
        });
      }
    }
  }

  // ── Bilans ─────────────────────────────────────────────────────────────────
  if (bilans.length > 0) {
    constats.push({
      niveau: "information",
      message:
        bilans.length === 1
          ? "Un bilan a été détecté parmi les pièces déposées."
          : `${bilans.length} bilans ont été détectés parmi les pièces déposées.`,
    });

    for (const doc of bilans) {
      const e = doc.extraction;
      if (e.chiffre_affaires.valeur !== null) {
        const exercice =
          e.exercice.valeur !== null ? ` (exercice ${e.exercice.valeur})` : "";
        constats.push({
          niveau: "information",
          message: `Un chiffre d'affaires a été détecté sur un bilan : ${formatEuros(
            e.chiffre_affaires.valeur,
          )}${exercice}.`,
          source: doc.nom_fichier,
        });
      } else {
        constats.push({
          niveau: "verification",
          message:
            "Le chiffre d'affaires n'a pas pu être détecté automatiquement sur un bilan.",
          source: doc.nom_fichier,
        });
      }

      if (e.resultat_net.valeur !== null && e.resultat_net.valeur < 0) {
        constats.push({
          niveau: "attention",
          message: `Un résultat net négatif a été détecté sur un bilan : ${formatEuros(
            e.resultat_net.valeur,
          )}.`,
          source: doc.nom_fichier,
        });
      }
    }
  }

  // ── Baux ───────────────────────────────────────────────────────────────────
  if (baux.length > 0) {
    constats.push({
      niveau: "information",
      message:
        baux.length === 1
          ? "Un bail commercial a été détecté parmi les pièces déposées."
          : `${baux.length} baux commerciaux ont été détectés parmi les pièces déposées.`,
    });

    for (const doc of baux) {
      const e = doc.extraction;
      if (e.loyer_annuel.valeur !== null) {
        constats.push({
          niveau: "information",
          message: `Un loyer annuel a été détecté sur le bail : ${formatEuros(
            e.loyer_annuel.valeur,
          )}.`,
          source: doc.nom_fichier,
        });
      }
      if (e.duree_annees.valeur !== null) {
        constats.push({
          niveau: "information",
          message: `Une durée de bail a été détectée : ${e.duree_annees.valeur} ans.`,
          source: doc.nom_fichier,
        });
      }
      if (e.clause_cession_presente.valeur === true) {
        constats.push({
          niveau: "verification",
          message:
            "Une mention de cession du bail semble présente — à vérifier dans le document complet.",
          source: doc.nom_fichier,
        });
      }
      if (e.bailleur.valeur === null) {
        constats.push({
          niveau: "verification",
          message:
            "Le bailleur n'a pas pu être détecté automatiquement sur le bail.",
          source: doc.nom_fichier,
        });
      }
    }
  }

  // ── Documents non extractibles ─────────────────────────────────────────────
  for (const doc of documents) {
    if (!("non_extractible" in doc.extraction)) continue;

    if (doc.extraction.raison === "pdf_scanne") {
      const libelle = libelleTypePresent(doc.type_document);
      constats.push({
        niveau: "verification",
        message: libelle
          ? `${libelle} est présent mais non lisible automatiquement (PDF scanné).`
          : "Un document est présent mais non lisible automatiquement (PDF scanné).",
        source: doc.nom_fichier,
      });
    }
  }

  const typesNonSupportes = documents.filter(
    (d) =>
      "non_extractible" in d.extraction &&
      d.extraction.raison === "type_non_supporte",
  );
  if (typesNonSupportes.length > 0) {
    constats.push({
      niveau: "information",
      message:
        typesNonSupportes.length === 1
          ? "1 document n'est pas analysé dans cette version (type non encore pris en charge)."
          : `${typesNonSupportes.length} documents ne sont pas analysés dans cette version (type non encore pris en charge).`,
    });
  }

  const textesInsuffisants = documents.filter(
    (d) =>
      "non_extractible" in d.extraction &&
      d.extraction.raison === "texte_insuffisant",
  );
  if (textesInsuffisants.length > 0) {
    constats.push({
      niveau: "verification",
      message:
        textesInsuffisants.length === 1
          ? "1 document a un texte trop court pour être analysé automatiquement."
          : `${textesInsuffisants.length} documents ont un texte trop court pour être analysés automatiquement.`,
    });
  }

  return constats;
}
