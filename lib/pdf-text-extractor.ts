import "server-only";

export type PdfExtractionResult = {
  text: string;
  nb_caracteres: number;
  extraction_ok: boolean;
  erreur?: string;
};

export async function extractPdfText(
  buffer: ArrayBuffer
): Promise<PdfExtractionResult> {
  try {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buffer));
    const trimmed = (Array.isArray(text) ? text.join("\n") : text).trim();
    return {
      text: trimmed,
      nb_caracteres: trimmed.length,
      extraction_ok: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return {
      text: "",
      nb_caracteres: 0,
      extraction_ok: false,
      erreur: message,
    };
  }
}
