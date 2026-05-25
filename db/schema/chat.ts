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
  role: varchar({ length: 20 }).notNull(),
  content: text().notNull(),
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
