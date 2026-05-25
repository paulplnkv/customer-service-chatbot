import { db } from "@/db";
import { knowledgeBase } from "@/db/schema/knowledge-base";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embed, embedMany } from "ai";
import { embeddingModel } from "@/lib/ai/provider";

export async function insertKnowledgeBaseEntry(
  content: string,
  metadata?: Record<string, unknown>
) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: content,
  });

  const [entry] = await db
    .insert(knowledgeBase)
    .values({
      content,
      embedding,
      metadata: metadata ?? null,
    })
    .returning({ id: knowledgeBase.id });

  return entry;
}

export async function insertKnowledgeBaseEntries(
  chunks: string[],
  metadata?: Record<string, unknown>
) {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });

  const rows = chunks.map((content, i) => ({
    content,
    embedding: embeddings[i],
    metadata: metadata ? { ...metadata, chunkIndex: i } : null,
  }));

  const entries = await db
    .insert(knowledgeBase)
    .values(rows)
    .returning({ id: knowledgeBase.id });

  return entries;
}

export async function searchKnowledgeBase(
  query: string,
  topK: number = 3,
  similarityThreshold: number = 0.3
) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "rag-query-embedding",
      metadata: {
        queryLength: query.length,
        topK,
        similarityThreshold,
      },
    },
  });

  const similarity = sql<number>`1 - (${cosineDistance(knowledgeBase.embedding, embedding)})`;

  const results = await db
    .select({
      id: knowledgeBase.id,
      content: knowledgeBase.content,
      metadata: knowledgeBase.metadata,
      similarity,
    })
    .from(knowledgeBase)
    .where(gt(similarity, similarityThreshold))
    .orderBy(desc(similarity))
    .limit(topK);

  return results;
}

export async function getAllKnowledgeBaseEntries() {
  return db
    .select({
      id: knowledgeBase.id,
      content: knowledgeBase.content,
      metadata: knowledgeBase.metadata,
      createdAt: knowledgeBase.createdAt,
    })
    .from(knowledgeBase)
    .orderBy(desc(knowledgeBase.createdAt));
}

export async function getPaginatedKnowledgeBaseEntries(
  page: number,
  pageSize: number
) {
  const offset = (page - 1) * pageSize;

  const [entries, countResult] = await Promise.all([
    db
      .select({
        id: knowledgeBase.id,
        content: knowledgeBase.content,
        metadata: knowledgeBase.metadata,
        createdAt: knowledgeBase.createdAt,
      })
      .from(knowledgeBase)
      .orderBy(desc(knowledgeBase.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBase),
  ]);

  const totalCount = Number(countResult[0].count);

  return { entries, totalCount };
}

export async function deleteKnowledgeBaseEntry(id: string) {
  await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
}
