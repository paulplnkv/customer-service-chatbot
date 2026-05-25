import { db } from "@/db";
import { messages } from "@/db/schema/chat";
import { eq, asc } from "drizzle-orm";
import type { UIMessage } from "ai";

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  const [message] = await db
    .insert(messages)
    .values({ conversationId, role, content })
    .returning();
  return message;
}

export async function getMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export function dbMessagesToUIMessages(
  dbMessages: { id: string; role: string; content: string; createdAt: Date }[]
): UIMessage[] {
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as UIMessage["role"],
    parts: [{ type: "text" as const, text: msg.content }],
  }));
}

export function uiMessageToText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}
