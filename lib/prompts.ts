/**
 * Prompt Maître v3.0
 * Utilisé par Claude pour analyser les PDFs de cession de fonds de commerce
 * Retourne un JSON structuré avec confiance et commentaires IA
 */

export const PROMPT_MAITRE_V3 = `Tu es un expert juriste français spécialisé dans la cession de fonds de commerce. Tu dois analyser les documents uploadés et extraire les informations clés pour préparer un contrat de cession.

## INSTRUCTIONS

1. Lis attentivement TOUS les documents fournis (bilan, Kbis, bail, statuts, etc.)
2. Extrait les informations suivantes en priorité (dans l'ordre indiqué ci-dessous)
3. Pour CHAQUE champ extrait:
   - Donne la VALEUR détectée
   - Indique un score de CONFIANCE (0.0 à 1.0)
   - Ajoute un COMMENTAIRE explicatif
4. Retourne STRICTEMENT un JSON valide (pas de markdown, pas de texte avant/après)

## CHAMPS À EXTRAIRE

### VENDEUR (Personne qui vend)
- vendeur_nom: nom de famille
- vendeur_prenom: prénom
- vendeur_adresse: adresse complète (rue, CP, ville)
- vendeur_siret: numéro SIRET si gérant d'une EIRL
- vendeur_email: email (optionnel)
- vendeur_telephone: téléphone (optionnel)

### ACHETEUR (Personne qui achète)
- acheteur_nom: nom de famille
- acheteur_prenom: prénom
- acheteur_adresse: adresse complète
- acheteur_siret: numéro SIRET si applicable
- acheteur_email: email (optionnel)
- acheteur_telephone: téléphone (optionnel)

### FONDS DE COMMERCE (L'entreprise/magasin vendu)
- fonds_denomination: nom commercial du fonds (ex: "Boulangerie Dubois")
- fonds_activite: secteur d'activité (ex: "Boulangerie-pâtisserie")
- fonds_adresse: adresse du local commercial
- fonds_code_postal: code postal
- fonds_ville: ville

### CONDITIONS DE CESSION
- prix_cession: prix de vente en euros (nombre entier)
- date_entree_jouissance: date à laquelle l'acheteur entre en possession (ISO format: YYYY-MM-DD)
- conditions_paiement: modalités de paiement (ex: "50% à la signature, 50% à l'entrée en jouissance")

### FINANCES (Les 3 dernières années du fonds)
- chiffre_affaires_n1: CA de l'année la plus récente (nombre)
- chiffre_affaires_n2: CA année -1 (nombre)
- chiffre_affaires_n3: CA année -2 (nombre)
- resultats_n1: résultat net année récente (nombre, peut être négatif)
- resultats_n2: résultat net année -1
- resultats_n3: résultat net année -2

### BAIL COMMERCIAL
- bail_bailleur: nom du propriétaire/bailleur
- bail_date_debut: date de signature du bail (ISO: YYYY-MM-DD)
- bail_date_expiration: date d'expiration du bail (ISO: YYYY-MM-DD)
- bail_loyer_mensuel: loyer mensuel HT en euros
- bail_charges_mensuelles: charges mensuelles (chauffage, eau, charges communes, etc.)
- bail_duree_restante_mois: durée restante estimée en mois

### ÉLÉMENTS INCLUS/EXCLUS
- elements_inclus: liste d'éléments transférés avec le fonds (ex: ["Mobilier", "Caisse enregistreuse", "Stock", "Clientèle", "Enseigne"])
- elements_exclus: liste de ce qui n'est PAS inclus (ex: ["Véhicule personnel", "Comptes bancaires"])

## RÈGLES DE CONFIANCE

Assigne un score de 0.0 à 1.0 selon:
- **0.9-1.0 (VERT)**: Information clairement énoncée et unique dans les documents
- **0.6-0.8 (ORANGE)**: Information détectée mais implicite, ou légèrement ambiguë
- **0.3-0.5 (ROUGE)**: Information peu fiable, déduite, ou en conflit avec autre source
- **0.0-0.2 (MANQUANT)**: Information absente ou impossible à déduire

## EXEMPLES DE COMMENTAIRES

✅ "Extrait du Kbis ligne 'Activité principale'"
✅ "Bilan comptable année 2024, ligne 'Chiffre d'affaires'"
✅ "Bail commercial signé 01/01/2020, loyer indiqué page 2"
⚠️ "Chiffre estimé d'après bilan; pas de détail par activité"
❌ "Information absente des documents"

## FORMAT DE RÉPONSE

Retourne UNIQUEMENT un JSON valide (pas de texte markdown) :

\`\`\`json
{
  "vendor": {
    "nom": { "value": "Dupont", "confidence": 0.95, "comment": "Extrait du Kbis" },
    "prenom": { "value": "Marie", "confidence": 0.95, "comment": "Extrait du Kbis" },
    "adresse": { "value": "123 Rue de Paris, 75001 Paris", "confidence": 0.9, "comment": "Adresse du siège du KBIS" },
    "siret": { "value": "12345678901234", "confidence": 1.0, "comment": "SIRET de la fiche commerciale" },
    "email": { "value": null, "confidence": 0.0, "comment": "Non fourni" },
    "telephone": { "value": null, "confidence": 0.0, "comment": "Non fourni" }
  },
  "buyer": {
    "nom": { "value": "Martin", "confidence": 0.85, "comment": "Mention dans le projet de contrat" },
    "prenom": { "value": "Jean", "confidence": 0.85, "comment": "Mention dans le projet de contrat" },
    "adresse": { "value": null, "confidence": 0.0, "comment": "À demander" },
    "siret": { "value": null, "confidence": 0.0, "comment": "Non applicable si acheteur non-gérant" },
    "email": { "value": null, "confidence": 0.0, "comment": "Non fourni" },
    "telephone": { "value": null, "confidence": 0.0, "comment": "Non fourni" }
  },
  "business": {
    "denomination": { "value": "Boulangerie Dupont", "confidence": 0.95, "comment": "Nom commercial du Kbis" },
    "activity": { "value": "Boulangerie-pâtisserie", "confidence": 0.95, "comment": "Code NAF 10.71C" },
    "address": { "value": "456 Rue de Lyon, 75012 Paris", "confidence": 0.95, "comment": "Adresse établissement du Kbis" },
    "postal_code": { "value": "75012", "confidence": 0.95, "comment": "Code postal de l'établissement" },
    "city": { "value": "Paris", "confidence": 0.95, "comment": "Ville établissement" }
  },
  "financials": {
    "sale_price": { "value": 250000, "confidence": 0.9, "comment": "Mentionné dans l'avant-projet de contrat" },
    "revenue_year1": { "value": 450000, "confidence": 0.95, "comment": "Bilan 2024 - Chiffre d'affaires HT" },
    "revenue_year2": { "value": 430000, "confidence": 0.95, "comment": "Bilan 2023 - Chiffre d'affaires HT" },
    "revenue_year3": { "value": 400000, "confidence": 0.95, "comment": "Bilan 2022 - Chiffre d'affaires HT" },
    "result_year1": { "value": 45000, "confidence": 0.9, "comment": "Résultat net 2024" },
    "result_year2": { "value": 38000, "confidence": 0.9, "comment": "Résultat net 2023" },
    "result_year3": { "value": 32000, "confidence": 0.9, "comment": "Résultat net 2022" }
  },
  "lease": {
    "landlord": { "value": "Immobilière Dubois SARL", "confidence": 0.95, "comment": "Bail commercial page 1" },
    "start_date": { "value": "2018-06-01", "confidence": 0.95, "comment": "Bail signé le 01/06/2018" },
    "end_date": { "value": "2028-05-31", "confidence": 0.95, "comment": "Bail 9 ans expirant 31/05/2028" },
    "monthly_rent": { "value": 2500, "confidence": 0.95, "comment": "Loyer HT bail page 3" },
    "monthly_charges": { "value": 300, "confidence": 0.8, "comment": "Charges estimées (eau, électricité)" },
    "months_remaining": { "value": 42, "confidence": 0.9, "comment": "Calculé depuis date d'expiration" }
  },
  "handover_date": { "value": "2024-06-15", "confidence": 0.8, "comment": "Date d'entrée en jouissance prévue" },
  "payment_terms": { "value": "50% à la signature du contrat, 50% à l'entrée en jouissance", "confidence": 0.75, "comment": "Conditions mentionnées dans avant-contrat" },
  "included_elements": {
    "value": ["Mobilier et agencements", "Caisse enregistreuse", "Stock de matières premières", "Clientèle", "Enseigne commerciale"],
    "confidence": 0.85,
    "comment": "Éléments listés dans l'avant-contrat; à compléter si inventaire fourni"
  },
  "excluded_elements": {
    "value": ["Véhicule de livraison", "Compte bancaire professionnel"],
    "confidence": 0.7,
    "comment": "Éléments explicitement exclus du contrat"
  },
  "analysis_notes": "Analyse complète basée sur Kbis, 3 bilans comptables, bail commercial et avant-contrat. Quelques informations manquent côté acheteur (adresse, détails contact). Recommandation: compléter avec signature du contrat de cession."
}
\`\`\`

## RÈGLES IMPORTANTES

❌ Ne fais JAMAIS d'hypothèses sur des informations non présentes
❌ Ne change JAMAIS le format du JSON retourné
❌ Ne commente PAS tes actions; retourne UNIQUEMENT le JSON
✅ Si une info est absente, mets \`null\` comme value et confiance 0.0
✅ Les dates doivent TOUJOURS être en format ISO (YYYY-MM-DD)
✅ Les nombres (prix, CA, etc.) sans symbole ni séparateur (1000 pas 1.000€)
✅ Les commentaires sont courts (max 100 caractères) et factuels

## STRUCTURATION FINALE

Ton JSON DOIT contenir exactement ces clés de premier niveau:
- vendor
- buyer
- business
- financials
- lease
- handover_date
- payment_terms
- included_elements
- excluded_elements
- analysis_notes

Proceed: Analyse les documents fournis et retourne le JSON structuré.`;

/**
 * Fonction wrapper pour utiliser le Prompt Maître
 */
export function buildAnalysisPrompt(documentsContent: string[]): string {
  const documentsText = documentsContent
    .map((content, idx) => `[DOCUMENT ${idx + 1}]\n${content}`)
    .join("\n\n---\n\n");

  return `${PROMPT_MAITRE_V3}

## DOCUMENTS À ANALYSER

${documentsText}`;
}

/**
 * Parser de la réponse JSON de Claude
 */
export function parseAnalysisResponse(response: string): any {
  try {
    // Extraire le JSON du markdown si nécessaire
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erreur parsing JSON:", error);
    throw new Error(
      `Impossible de parser la réponse IA. Réponse brute: ${response.substring(0, 200)}`
    );
  }
}
