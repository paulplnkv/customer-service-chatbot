import { config } from "dotenv";
config({ path: ".env.local" });
import { readdirSync, readFileSync } from "fs";
import { join, basename, extname } from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { knowledgeBase } from "../db/schema/knowledge-base";
import { embedMany } from "ai";
import mammoth from "mammoth";
import { embeddingModel } from "../lib/ai/provider";
import { chunkHtmlDocument, chunkBySection } from "../lib/utils/chunk-text";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Directory holding the Sterling Auto knowledge-base articles (Markdown).
const KB_DIR = join(process.cwd(), "demo", "Knowledge Base");

// Directory holding individual customer policy summaries.
const POLICIES_DIR = join(process.cwd(), "demo", "Policies");

const SUPPORTED = /\.(docx|md|txt)$/i;

// Derive a short document-id "topic" from the filename, e.g.
// "CLM-AUTO-001_Claims_Process_and_Payout_Timing.md" -> "CLM-AUTO-001".
function deriveTopic(filename: string): string {
  const stem = basename(filename).replace(SUPPORTED, "");
  const match = stem.match(/^([A-Z]+-[A-Z]+(?:-[A-Z]+)?-\d+)/);
  return match ? match[1] : stem;
}

// Extract the policy number from the raw text content of a policy document.
// Looks for a line matching "POLICY NO. STER-XXX-YYYY-NNNNN".
function extractPolicyNumber(text: string): string | null {
  const match = text.match(/POLICY\s+NO\.?\s+(STER-[A-Z0-9]+-\d{4}-\d+)/i);
  return match ? match[1] : null;
}

// Read a file and return its chunks plus the raw plain text. Markdown/text are
// chunked by section heading; .docx is converted via mammoth then chunked by
// its HTML heading structure.
async function readChunks(
  dir: string,
  filename: string
): Promise<{ chunks: string[]; plainText: string }> {
  const ext = extname(filename).toLowerCase();
  const path = join(dir, filename);

  if (ext === ".docx") {
    const buffer = readFileSync(path);
    const [{ value: html }, { value: plainText }] = await Promise.all([
      mammoth.convertToHtml({ buffer }),
      mammoth.extractRawText({ buffer }),
    ]);
    return { chunks: chunkHtmlDocument(html), plainText };
  }

  const plainText = readFileSync(path, "utf8");
  return { chunks: chunkBySection(plainText), plainText };
}

async function ingestDirectory(
  dir: string,
  source: string,
  topicFn: (filename: string, text: string) => string,
  extraMetaFn?: (filename: string, text: string) => Record<string, unknown>
): Promise<number> {
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => SUPPORTED.test(f) && !f.startsWith("~$"))
      .sort();
  } catch {
    console.warn(`Directory not found, skipping: ${dir}`);
    return 0;
  }

  if (files.length === 0) {
    console.warn(`No supported (.docx/.md/.txt) files found in ${dir}`);
    return 0;
  }

  let totalChunks = 0;

  for (const filename of files) {
    const { chunks, plainText } = await readChunks(dir, filename);
    if (chunks.length === 0) {
      console.log(`  Skipping ${filename} — no extractable content.`);
      continue;
    }

    const topic = topicFn(filename, plainText);
    const extraMeta = extraMetaFn ? extraMetaFn(filename, plainText) : {};

    console.log(`  Embedding ${filename} (${topic}) — ${chunks.length} chunk(s)...`);

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });

    await db.insert(knowledgeBase).values(
      chunks.map((content, i) => ({
        content,
        embedding: embeddings[i],
        metadata: {
          source,
          filename,
          topic,
          chunkIndex: i,
          totalChunks: chunks.length,
          ...extraMeta,
        },
      }))
    );

    totalChunks += chunks.length;
    console.log(`    Stored ${chunks.length} chunk(s).\n`);
  }

  return totalChunks;
}

async function seed() {
  console.log("Seeding knowledge base...\n");

  // Clear existing entries
  await db.delete(knowledgeBase);
  console.log("Cleared existing knowledge base entries.\n");

  // 1. Ingest general auto knowledge-base articles
  console.log(`[1/2] Knowledge base articles: ${KB_DIR}\n`);
  const kbChunks = await ingestDirectory(
    KB_DIR,
    "kb",
    (filename) => deriveTopic(filename)
  );
  console.log(`Knowledge base: ${kbChunks} chunk(s) stored.\n`);

  // 2. Ingest individual policy summary documents
  console.log(`[2/2] Policy summaries: ${POLICIES_DIR}\n`);
  const policyChunks = await ingestDirectory(
    POLICIES_DIR,
    "policy",
    (_filename, text) => {
      const policyNumber = extractPolicyNumber(text);
      return policyNumber ?? _filename.replace(SUPPORTED, "");
    },
    (_filename, text) => {
      const policyNumber = extractPolicyNumber(text);
      return policyNumber ? { policyNumber } : {};
    }
  );
  console.log(`Policy summaries: ${policyChunks} chunk(s) stored.\n`);

  const totalChunks = kbChunks + policyChunks;
  console.log(`Done! Seeded ${totalChunks} total knowledge base chunks.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
