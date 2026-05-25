import { db } from "@/db";
import { escalations } from "@/db/schema/escalations";
import { eq } from "drizzle-orm";

export async function createEscalation(params: {
  conversationId: string;
  userId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  chatSummary: string | null;
  reason: string;
}) {
  const [escalation] = await db
    .insert(escalations)
    .values({
      conversationId: params.conversationId,
      userId: params.userId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      chatSummary: params.chatSummary,
      reason: params.reason,
      status: "pending",
    })
    .returning();

  return escalation;
}

export async function getAllEscalations() {
  return db
    .select()
    .from(escalations)
    .orderBy(escalations.createdAt);
}

export async function getEscalationByConversationId(conversationId: string) {
  const result = await db
    .select()
    .from(escalations)
    .where(eq(escalations.conversationId, conversationId))
    .limit(1);

  return result[0] ?? null;
}
