import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid().primaryKey().defaultRandom(),
  content: text().notNull(),
  embedding: vector({ dimensions: 1536 }),
  metadata: jsonb(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
