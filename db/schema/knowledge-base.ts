import { pgTable, uuid, text, timestamp, jsonb, customType } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// PostgreSQL tsvector type — used for the generated full-text search column.
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid().primaryKey().defaultRandom(),
  content: text().notNull(),
  embedding: vector({ dimensions: 1536 }),
  metadata: jsonb(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Populated automatically by PostgreSQL; never set on insert.
  searchTsv: tsvector("search_tsv").generatedAlwaysAs(
    sql`to_tsvector('english', content)`
  ),
});
