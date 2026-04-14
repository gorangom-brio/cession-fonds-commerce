import Anthropic from "@anthropic-ai/sdk";
import { buildAnalysisPrompt, parseAnalysisResponse } from "./prompts";
import type { AnalysisResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeDocuments(documentsContent: string[]): Promise<AnalysisResult> {
  if (!documentsContent || documentsContent.length === 0) {
    throw new Error("Aucun document à analyser");
  }

  const prompt = buildAnalysisPrompt(documentsContent);

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const parsedResponse = parseAnalysisResponse(responseText);

  const result: AnalysisResult = {
    cession_id: "",
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
}
