import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { conversations } from "./chat";

export const escalations = pgTable("escalations", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  userId: text("user_id"),
  customerName: varchar("customer_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  chatSummary: text("chat_summary"),
  reason: text(),
  status: varchar({ length: 20 }).notNull().default("pending"),
  // Support-agent reply that the assistant turns into a recap for the customer.
  agentName: varchar("agent_name", { length: 255 }),
  agentResponse: text("agent_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Relations

export const escalationsRelations = relations(escalations, ({ one }) => ({
  conversation: one(conversations, {
    fields: [escalations.conversationId],
    references: [conversations.id],
  }),
}));
