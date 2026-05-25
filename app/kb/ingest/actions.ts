"use server";

import { revalidatePath } from "next/cache";
import { insertKnowledgeBaseEntry, insertKnowledgeBaseEntries } from "@/lib/db/knowledge-base";
import { extractText } from "unpdf";
import { chunkBySection } from "@/lib/utils/chunk-text";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function ingestText(formData: FormData) {
  const content = formData.get("content") as string;

  if (!content || content.trim().length === 0) {
    return { success: false as const, error: "Content cannot be empty" };
  }

  if (content.length > 50000) {
    return { success: false as const, error: "Content is too long (max 50,000 characters)" };
  }

  try {
    const trimmed = content.trim();
    const chunks = chunkBySection(trimmed);

    if (chunks.length === 0) {
      return { success: false as const, error: "No content to ingest after processing" };
    }

    if (chunks.length === 1) {
      const entry = await insertKnowledgeBaseEntry(chunks[0], {
        source: "text",
      });
      revalidatePath("/kb");
      return { success: true as const, id: entry.id };
    }

    const metadata = {
      source: "text",
      totalChunks: chunks.length,
    };

    const entries = await insertKnowledgeBaseEntries(chunks, metadata);
    revalidatePath("/kb");
    return { success: true as const, chunksInserted: entries.length };
  } catch (error) {
    console.error("Knowledge base ingestion failed:", error);
    return { success: false as const, error: "Failed to ingest content. Please try again." };
  }
}

export async function ingestPdf(formData: FormData) {
  const file = formData.get("file") as File | null;

  if (!file) {
    return { success: false as const, error: "No file provided" };
  }

  if (file.type !== "application/pdf") {
    return { success: false as const, error: "Only PDF files are supported" };
  }

  if (file.size > MAX_PDF_SIZE) {
    return { success: false as const, error: "File is too large (max 10MB)" };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });

    if (!text || text.trim().length === 0) {
      return {
        success: false as const,
        error: "No text could be extracted from this PDF. It may be scanned or image-based.",
      };
    }

    const chunks = chunkBySection(text);

    if (chunks.length === 0) {
      return { success: false as const, error: "No content to ingest after processing" };
    }

    const metadata = {
      source: "pdf",
      filename: file.name,
      totalChunks: chunks.length,
    };

    const entries = await insertKnowledgeBaseEntries(chunks, metadata);

    revalidatePath("/kb");
    return { success: true as const, chunksInserted: entries.length };
  } catch (error) {
    console.error("PDF ingestion failed:", error);
    return { success: false as const, error: "Failed to process PDF. Please try again." };
  }
}
