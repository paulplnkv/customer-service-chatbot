import { db } from "@/db";
import { conversations, messages } from "@/db/schema/chat";
import { escalations } from "@/db/schema/escalations";
import { eq, or, desc, asc } from "drizzle-orm";
import type { SessionIdentity } from "@/lib/session";

export async function getConversations({ userId, anonymousSessionId }: SessionIdentity) {
  const conditions = [];
  if (userId) conditions.push(eq(conversations.userId, userId));
  if (anonymousSessionId)
    conditions.push(eq(conversations.anonymousSessionId, anonymousSessionId));

  if (conditions.length === 0) return [];

  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .orderBy(desc(conversations.updatedAt))
    .limit(50);
}

export async function getConversationWithMessages(
  conversationId: string,
  identity: SessionIdentity
) {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) return null;

  // Ownership check
  const isOwner =
    (identity.userId && conversation.userId === identity.userId) ||
    (identity.anonymousSessionId &&
      conversation.anonymousSessionId === identity.anonymousSessionId);

  if (!isOwner) return null;

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return { conversation, messages: msgs };
}

export async function createConversation(
  identity: SessionIdentity,
  title?: string,
  id?: string
) {
  const [conversation] = await db
    .insert(conversations)
    .values({
      ...(id ? { id } : {}),
      userId: identity.userId,
      anonymousSessionId: identity.anonymousSessionId,
      title: title ?? "New conversation",
    })
    .returning({ id: conversations.id });

  return conversation.id;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function conversationExists(conversationId: string) {
  const result = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: { id: true },
  });
  return !!result;
}

export async function touchConversation(conversationId: string) {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function deleteConversation(
  conversationId: string,
  identity: SessionIdentity
) {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: { id: true, userId: true, anonymousSessionId: true },
  });

  if (!conversation) return false;

  const isOwner =
    (identity.userId && conversation.userId === identity.userId) ||
    (identity.anonymousSessionId &&
      conversation.anonymousSessionId === identity.anonymousSessionId);

  if (!isOwner) return false;

  // Delete related records first, then conversation
  await db.delete(escalations).where(eq(escalations.conversationId, conversationId));
  await db.delete(messages).where(eq(messages.conversationId, conversationId));
  await db.delete(conversations).where(eq(conversations.id, conversationId));

  return true;
}
