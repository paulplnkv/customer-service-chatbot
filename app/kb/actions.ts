"use server";

import { revalidatePath } from "next/cache";
import { deleteKnowledgeBaseEntry } from "@/lib/db/knowledge-base";

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
