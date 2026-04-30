export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf-text-extractor";
import { extraire } from "@/lib/extractors";
import type { StructuredExtractionResponse } from "@/lib/extractors/types";

const IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!IS_UUID.test(id)) {
    return NextResponse.json(
      { error: "Identifiant de dossier invalide." },
      { status: 400 }
    );
  }

  const { data: documents, error: dbError } = await supabaseAdmin
    .from("documents")
    .select("id, nom_fichier, storage_path, type_document")
    .eq("cession_id", id)
    .order("created_at", { ascending: true });

  if (dbError) {
    return NextResponse.json(
      { error: "Impossible de récupérer les documents." },
      { status: 500 }
    );
  }

  const pdfs = (documents ?? []).filter((doc) =>
    doc.nom_fichier.toLowerCase().endsWith(".pdf")
  );

  const results = await Promise.all(
    pdfs.map(async (doc) => {
      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from("documents")
        .download(doc.storage_path);

      if (downloadError || !blob) {
        return {
          id: doc.id,
          nom_fichier: doc.nom_fichier,
          type_document: doc.type_document,
          extraction: {
            type: doc.type_document ?? "inconnu",
            non_extractible: true as const,
            raison: "texte_insuffisant" as const,
          },
        };
      }

      const buffer = await blob.arrayBuffer();
      const { text } = await extractPdfText(buffer);

      return {
        id: doc.id,
        nom_fichier: doc.nom_fichier,
        type_document: doc.type_document,
        extraction: extraire(doc.type_document, text),
      };
    })
  );

  const response: StructuredExtractionResponse = {
    cession_id: id,
    documents: results,
  };

  return NextResponse.json(response);
}
