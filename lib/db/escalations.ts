import { db } from "@/db";
import { escalations } from "@/db/schema/escalations";
import { desc, eq } from "drizzle-orm";

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
    .orderBy(desc(escalations.createdAt));
}

export async function getEscalationById(id: string) {
  const result = await db
    .select()
    .from(escalations)
    .where(eq(escalations.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function getEscalationByConversationId(conversationId: string) {
  const result = await db
    .select()
    .from(escalations)
    .where(eq(escalations.conversationId, conversationId))
    .orderBy(desc(escalations.createdAt))
    .limit(1);

  return result[0] ?? null;
}

// A human agent has joined the conversation: the escalation moves to "live" and
// the customer chat routes the customer's turns to the agent instead of the AI.
export async function setEscalationLive(params: {
  id: string;
  agentName: string;
}) {
  const [escalation] = await db
    .update(escalations)
    .set({ agentName: params.agentName, status: "live" })
    .where(eq(escalations.id, params.id))
    .returning();

  return escalation;
}

// Record the support agent's reply and mark the escalation resolved. The
// customer-facing recap is saved separately as an assistant message.
export async function resolveEscalationWithResponse(params: {
  id: string;
  agentName: string;
  agentResponse: string;
}) {
  const [escalation] = await db
    .update(escalations)
    .set({
      agentName: params.agentName,
      agentResponse: params.agentResponse,
      status: "resolved",
      resolvedAt: new Date(),
    })
    .where(eq(escalations.id, params.id))
    .returning();

  return escalation;
}
