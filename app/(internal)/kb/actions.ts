"use server";

import { revalidatePath } from "next/cache";
import { deleteKnowledgeBaseEntry, deleteKnowledgeBaseDocument } from "@/lib/db/knowledge-base";

type ActionResult = { success: true } | { success: false; error: string };

export async function deleteChunkAction(id: string): Promise<ActionResult> {
  try {
    await deleteKnowledgeBaseEntry(id);
    revalidatePath("/kb");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete chunk." };
  }
}

export async function deleteDocumentAction(options: {
  documentId: string | null;
  filename: string | null;
  source: string;
}): Promise<ActionResult> {
  try {
    await deleteKnowledgeBaseDocument(options);
    revalidatePath("/kb");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete document." };
  }
}
