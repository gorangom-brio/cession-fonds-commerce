/**
 * Client Anthropic et fonctions d'analyse IA
 * Utilise le Prompt Maître pour analyser les PDFs
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildAnalysisPrompt, parseAnalysisResponse } from "./prompt-maitre";
import { AnalysisResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyse les documents uploadés avec Claude
 * Extrait les infos de cession et retourne un JSON structuré
 */
export async function analyzeDocuments(
  documentsContent: string[]
): Promise<AnalysisResult> {
  if (!documentsContent || documentsContent.length === 0) {
    throw new Error("Aucun document à analyser");
  }

  try {
    const prompt = buildAnalysisPrompt(documentsContent);

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extraire le texte de la réponse
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parser la réponse JSON
    const parsedResponse = parseAnalysisResponse(responseText);

    // Convertir en AnalysisResult
    const result: AnalysisResult = {
      cession_id: "", // À remplir par l'appelant
      timestamp: new Date().toISOString(),
      vendor: {
        name: parsedResponse.vendor?.nom,
        firstname: parsedResponse.vendor?.prenom,
        address: parsedResponse.vendor?.adresse,
        siret: parsedResponse.vendor?.siret,
        email: parsedResponse.vendor?.email,
        phone: parsedResponse.vendor?.telephone,
      },
      buyer: {
        name: parsedResponse.buyer?.nom,
        firstname: parsedResponse.buyer?.prenom,
        address: parsedResponse.buyer?.adresse,
        siret: parsedResponse.buyer?.siret,
        email: parsedResponse.buyer?.email,
        phone: parsedResponse.buyer?.telephone,
      },
      business: {
        name: parsedResponse.business?.denomination,
        activity: parsedResponse.business?.activity,
        address: parsedResponse.business?.address,
        postal_code: parsedResponse.business?.postal_code,
        city: parsedResponse.business?.city,
      },
      financials: {
        sale_price: parsedResponse.financials?.sale_price,
        revenue_year1: parsedResponse.financials?.revenue_year1,
        revenue_year2: parsedResponse.financials?.revenue_year2,
        revenue_year3: parsedResponse.financials?.revenue_year3,
      },
      lease: {
        landlord: parsedResponse.lease?.landlord,
        end_date: parsedResponse.lease?.end_date,
        monthly_rent: parsedResponse.lease?.monthly_rent,
        monthly_charges: parsedResponse.lease?.monthly_charges,
      },
      handover_date: parsedResponse.handover_date,
      payment_terms: parsedResponse.payment_terms,
      included_elements: parsedResponse.included_elements,
      excluded_elements: parsedResponse.excluded_elements,
      raw_response: responseText,
    };

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur analyse IA: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Valide que l'API Anthropic est accessible
 */
export async function validateApiKey(): Promise<boolean> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY non configurée");
    }
    return true;
  } catch (error) {
    console.error("Validation API key échouée:", error);
    return false;
  }
}

/**
 * Génère un commentaire IA sur une étape du processus
 * (usage futur pour guidance utilisateur)
 */
export async function generateGuidanceComment(context: string): Promise<string> {
  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Tu es un assistant juridique français. Donne un conseil court et clair (max 150 caractères) pour: ${context}`,
        },
      ],
    });

    return message.content[0].type === "text" ? message.content[0].text : "";
  } catch (error) {
    console.error("Erreur génération commentaire:", error);
    return "";
  }
}
