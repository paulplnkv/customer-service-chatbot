-- Add generated tsvector column for full-text (BM25-style) search
ALTER TABLE "knowledge_base"
  ADD COLUMN "search_tsv" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

--> statement-breakpoint

-- GIN index speeds up full-text queries
CREATE INDEX "knowledge_base_tsv_idx" ON "knowledge_base" USING gin("search_tsv");

--> statement-breakpoint

-- HNSW index for fast approximate nearest-neighbour vector search at scale
CREATE INDEX "knowledge_base_embedding_idx"
  ON "knowledge_base" USING hnsw ("embedding" vector_cosine_ops);
