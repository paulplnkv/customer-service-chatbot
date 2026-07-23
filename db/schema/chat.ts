import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text("user_id"),
  anonymousSessionId: varchar("anonymous_session_id", { length: 255 }),
  title: varchar({ length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  // "user" | "assistant" | "agent" (a human support agent during a live handoff)
  role: varchar({ length: 20 }).notNull(),
  content: text().notNull(),
  // Display name of the human agent, set only on role = "agent" messages.
  agentName: varchar("agent_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
