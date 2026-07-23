import { db } from "@/db";
import { messages } from "@/db/schema/chat";
import { eq, asc } from "drizzle-orm";
import type { UIMessage } from "ai";

// "agent" is a human support agent replying during a live handoff. It is stored
// distinctly from "assistant" so the chat can attribute the message to a person.
export type MessageRole = "user" | "assistant" | "agent";

// Attached to UI messages that came from a human agent so the chat can render
// them with the agent's name instead of the bot styling.
export type AgentMessageMetadata = {
  sender: "agent";
  agentName: string | null;
};

export async function saveMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  agentName?: string | null
) {
  const [message] = await db
    .insert(messages)
    .values({ conversationId, role, content, agentName: agentName ?? null })
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

type DbMessageLike = {
  id: string;
  role: string;
  content: string;
  agentName?: string | null;
  createdAt: Date;
};

export function dbMessagesToUIMessages(dbMessages: DbMessageLike[]): UIMessage[] {
  return dbMessages.map((msg) => {
    const isAgent = msg.role === "agent";
    return {
      id: msg.id,
      // A human agent's turn is modelled as an assistant turn (the model and the
      // AI SDK only know user/assistant/system) but keeps its identity in metadata.
      role: (isAgent ? "assistant" : msg.role) as UIMessage["role"],
      ...(isAgent
        ? {
            metadata: {
              sender: "agent",
              agentName: msg.agentName ?? null,
            } satisfies AgentMessageMetadata,
          }
        : {}),
      parts: [{ type: "text" as const, text: msg.content }],
    };
  });
}

export function uiMessageToText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}
