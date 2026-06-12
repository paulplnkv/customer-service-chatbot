import { db } from "@/db";
import { knowledgeBase } from "@/db/schema/knowledge-base";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embed, embedMany } from "ai";
import { embeddingModel } from "@/lib/ai/provider";

export async function insertKnowledgeBaseEntry(
  content: string,
  metadata?: Record<string, unknown>
) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: content,
    abortSignal: AbortSignal.timeout(30_000),
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

const EMBED_BATCH_SIZE = 10;

export async function insertKnowledgeBaseEntries(
  chunks: string[],
  metadata?: Record<string, unknown>
) {
  const allEmbeddings: number[][] = [];
  const totalBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE);
  console.log(`[insertKnowledgeBaseEntries] ${chunks.length} chunks, ${totalBatches} batches`);

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    console.log(`[insertKnowledgeBaseEntries] batch ${batchNum}/${totalBatches} (${batch.length} chunks) — calling Azure`);
    const t = Date.now();
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: batch,
      abortSignal: AbortSignal.timeout(30_000),
    });
    console.log(`[insertKnowledgeBaseEntries] batch ${batchNum} done in ${Date.now() - t}ms`);
    allEmbeddings.push(...embeddings);
  }

  console.log(`[insertKnowledgeBaseEntries] inserting ${chunks.length} rows to DB`);
  const rows = chunks.map((content, i) => ({
    content,
    embedding: allEmbeddings[i],
    metadata: metadata ? { ...metadata, chunkIndex: i } : null,
  }));

  const entries = await db
    .insert(knowledgeBase)
    .values(rows)
    .returning({ id: knowledgeBase.id });

  console.log(`[insertKnowledgeBaseEntries] done, inserted ${entries.length} rows`);
  return entries;
}

export async function searchKnowledgeBase(
  query: string,
  topK: number = 3,
  similarityThreshold: number = 0.5,
  policyNumber?: string,
  /**
   * Authorization boundary for policy-specific KB chunks:
   *   undefined  — no restriction (back-office / internal use)
   *   []         — exclude all policy-owned chunks (unauthenticated customers)
   *   [...nums]  — allow only chunks owned by these policy numbers (authenticated customers)
   *
   * When provided, a `policyNumber` filter that is NOT in this list is silently dropped.
   */
  allowedPolicyNumbers?: string[]
) {
  // Defense-in-depth: drop policyNumber if caller is not authorised to see it.
  if (
    policyNumber &&
    allowedPolicyNumbers !== undefined &&
    !allowedPolicyNumbers.includes(policyNumber)
  ) {
    policyNumber = undefined;
  }

  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
    abortSignal: AbortSignal.timeout(30_000),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "rag-query-embedding",
      metadata: {
        queryLength: query.length,
        topK,
        similarityThreshold,
        ...(policyNumber ? { policyNumber } : {}),
      },
    },
  });

  const similarity = sql<number>`1 - (${cosineDistance(knowledgeBase.embedding, embedding)})`;

  // RRF constant — 60 is the standard value; higher values dampen rank differences.
  const RRF_K = 60;
  const CANDIDATE_LIMIT = 20;

  // When a policyNumber is provided, restrict results to that specific policy's chunks.
  const policyFilter = policyNumber
    ? sql`metadata->>'policyNumber' = ${policyNumber}`
    : undefined;

  // Access filter: prevents policy-specific chunks from being surfaced to users who do
  // not own that policy.  Only applied when allowedPolicyNumbers is defined (customer context).
  // - allowedPolicyNumbers === undefined  → no extra filter (back-office)
  // - allowedPolicyNumbers === []         → only non-policy chunks allowed
  // - allowedPolicyNumbers has entries    → non-policy chunks + owned policy chunks
  const accessFilter =
    allowedPolicyNumbers === undefined
      ? undefined
      : allowedPolicyNumbers.length === 0
        ? sql`(metadata->>'policyNumber') IS NULL`
        : sql`((metadata->>'policyNumber') IS NULL OR (metadata->>'policyNumber') = ANY(ARRAY[${sql.join(
            allowedPolicyNumbers.map((n) => sql`${n}`),
            sql`, `
          )}]::text[]))`;

  // When searching within a specific policy, policyFilter already scopes correctly;
  // the accessFilter is redundant (policyNumber was already validated above).
  const combinedFilter = policyFilter ?? accessFilter;

  // FTS access condition as a raw SQL fragment (embedded in the raw db.execute query).
  const ftsAccessCondition =
    allowedPolicyNumbers === undefined
      ? sql``
      : allowedPolicyNumbers.length === 0
        ? sql`AND (metadata->>'policyNumber') IS NULL`
        : sql`AND ((metadata->>'policyNumber') IS NULL OR (metadata->>'policyNumber') = ANY(ARRAY[${sql.join(
            allowedPolicyNumbers.map((n) => sql`${n}`),
            sql`, `
          )}]::text[]))`;

  // Run vector search and full-text search concurrently.
  const [vectorResults, ftsResult] = await Promise.all([
    db
      .select({
        id: knowledgeBase.id,
        content: knowledgeBase.content,
        metadata: knowledgeBase.metadata,
        similarity,
      })
      .from(knowledgeBase)
      .where(and(gt(similarity, similarityThreshold), combinedFilter))
      .orderBy(desc(similarity))
      .limit(CANDIDATE_LIMIT),

    policyNumber
      ? db.execute(sql`
          SELECT id::text, content, metadata,
                 ts_rank_cd(search_tsv, plainto_tsquery('english', ${query})) AS fts_rank
          FROM knowledge_base
          WHERE search_tsv @@ plainto_tsquery('english', ${query})
            AND metadata->>'policyNumber' = ${policyNumber}
          ORDER BY fts_rank DESC
          LIMIT ${CANDIDATE_LIMIT}
        `)
      : db.execute(sql`
          SELECT id::text, content, metadata,
                 ts_rank_cd(search_tsv, plainto_tsquery('english', ${query})) AS fts_rank
          FROM knowledge_base
          WHERE search_tsv @@ plainto_tsquery('english', ${query})
            ${ftsAccessCondition}
          ORDER BY fts_rank DESC
          LIMIT ${CANDIDATE_LIMIT}
        `),
  ]);

  type FtsRow = {
    id: string;
    content: string;
    metadata: Record<string, unknown> | null;
    fts_rank: number;
  };

  type Entry = {
    content: string;
    metadata: Record<string, unknown> | null;
    vectorRank: number | null;
    ftsRank: number | null;
  };

  // Merge results by ID using Reciprocal Rank Fusion.
  const scoreMap = new Map<string, Entry>();

  vectorResults.forEach((r, idx) => {
    scoreMap.set(r.id, {
      content: r.content,
      metadata: r.metadata as Record<string, unknown> | null,
      vectorRank: idx + 1,
      ftsRank: null,
    });
  });

  (ftsResult.rows as FtsRow[]).forEach((r, idx) => {
    const existing = scoreMap.get(r.id);
    if (existing) {
      existing.ftsRank = idx + 1;
    } else {
      scoreMap.set(r.id, {
        content: r.content,
        metadata: r.metadata,
        vectorRank: null,
        ftsRank: idx + 1,
      });
    }
  });

  return Array.from(scoreMap.entries())
    .map(([id, { content, metadata, vectorRank, ftsRank }]) => ({
      id,
      content,
      metadata,
      similarity:
        (vectorRank !== null ? 1 / (RRF_K + vectorRank) : 0) +
        (ftsRank !== null ? 1 / (RRF_K + ftsRank) : 0),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
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

export async function getKnowledgeBaseDocuments() {
  const rows = await db
    .select({
      documentId: sql<string | null>`metadata->>'documentId'`,
      filename: sql<string | null>`metadata->>'filename'`,
      source: sql<string>`coalesce(metadata->>'source', 'text')`,
      chunkCount: sql<number>`count(*)::int`,
      createdAt: sql<Date>`min(created_at)`,
    })
    .from(knowledgeBase)
    .groupBy(
      sql`metadata->>'documentId'`,
      sql`metadata->>'filename'`,
      sql`coalesce(metadata->>'source', 'text')`
    )
    .orderBy(sql`min(created_at) desc`);

  return rows;
}

export async function deleteKnowledgeBaseDocument(options: {
  documentId: string | null;
  filename: string | null;
  source: string;
}) {
  if (options.documentId) {
    await db
      .delete(knowledgeBase)
      .where(sql`metadata->>'documentId' = ${options.documentId}`);
  } else if (options.filename) {
    await db
      .delete(knowledgeBase)
      .where(
        sql`metadata->>'filename' = ${options.filename} and coalesce(metadata->>'source', 'text') = ${options.source}`
      );
  } else {
    await db
      .delete(knowledgeBase)
      .where(
        sql`(metadata->>'documentId') is null and (metadata->>'filename') is null and coalesce(metadata->>'source', 'text') = ${options.source}`
      );
  }
}
