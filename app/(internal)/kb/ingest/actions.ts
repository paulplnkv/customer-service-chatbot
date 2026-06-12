"use server";

import { revalidatePath } from "next/cache";
import { insertKnowledgeBaseEntry, insertKnowledgeBaseEntries } from "@/lib/db/knowledge-base";
import { chunkBySection } from "@/lib/utils/chunk-text";

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

    const documentId = crypto.randomUUID();

    if (chunks.length === 1) {
      const entry = await insertKnowledgeBaseEntry(chunks[0], {
        source: "text",
        documentId,
      });
      revalidatePath("/kb");
      return { success: true as const, id: entry.id };
    }

    const metadata = {
      source: "text",
      documentId,
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
