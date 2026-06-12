import { config } from "dotenv";
config({ path: ".env.local" });
import { readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { knowledgeBase } from "../db/schema/knowledge-base";
import { embedMany } from "ai";
import mammoth from "mammoth";
import { embeddingModel } from "../lib/ai/provider";
import { chunkHtmlDocument } from "../lib/utils/chunk-text";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Directory holding the STR / Starr Aviation knowledge-base documents.
const KB_DIR = join(process.cwd(), "demo", "Knowledge Base");

// Directory holding individual customer policy declaration sheets.
const POLICIES_DIR = join(process.cwd(), "demo", "Policies");

// Derive a short document-id "topic" from the filename, e.g.
// "POL-AV-001_Aircraft_Policy_Summary.docx" -> "POL-AV-001".
function deriveTopic(filename: string): string {
  const stem = basename(filename, ".docx");
  const match = stem.match(/^([A-Z]+-[A-Z]+(?:-[A-Z]+)?-\d+)/);
  return match ? match[1] : stem;
}

// Extract the policy number from the raw text content of a policy document.
// Looks for a line matching "POLICY NO. STAR-XXX-YYYY-NNNNN".
function extractPolicyNumber(text: string): string | null {
  const match = text.match(/POLICY\s+NO\.?\s+(STAR-[A-Z0-9]+-\d{4}-\d+)/i);
  return match ? match[1] : null;
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
      .filter((f) => f.toLowerCase().endsWith(".docx") && !f.startsWith("~$"))
      .sort();
  } catch {
    console.warn(`Directory not found, skipping: ${dir}`);
    return 0;
  }

  if (files.length === 0) {
    console.warn(`No .docx files found in ${dir}`);
    return 0;
  }

  let totalChunks = 0;

  for (const filename of files) {
    const buffer = readFileSync(join(dir, filename));
    const [{ value: html }, { value: plainText }] = await Promise.all([
      mammoth.convertToHtml({ buffer }),
      mammoth.extractRawText({ buffer }),
    ]);

    const chunks = chunkHtmlDocument(html);
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
  console.log("Seeding knowledge base from .docx files...\n");

  // Clear existing entries
  await db.delete(knowledgeBase);
  console.log("Cleared existing knowledge base entries.\n");

  // 1. Ingest general aviation knowledge-base articles
  console.log(`[1/2] Knowledge base articles: ${KB_DIR}\n`);
  const kbChunks = await ingestDirectory(
    KB_DIR,
    "kb-docx",
    (filename) => deriveTopic(filename)
  );
  console.log(`Knowledge base: ${kbChunks} chunk(s) stored.\n`);

  // 2. Ingest individual policy declaration documents
  console.log(`[2/2] Policy declarations: ${POLICIES_DIR}\n`);
  const policyChunks = await ingestDirectory(
    POLICIES_DIR,
    "policy-docx",
    (_filename, text) => {
      const policyNumber = extractPolicyNumber(text);
      return policyNumber ?? _filename.replace(".docx", "");
    },
    (_filename, text) => {
      const policyNumber = extractPolicyNumber(text);
      return policyNumber ? { policyNumber } : {};
    }
  );
  console.log(`Policy declarations: ${policyChunks} chunk(s) stored.\n`);

  const totalChunks = kbChunks + policyChunks;
  console.log(`Done! Seeded ${totalChunks} total knowledge base chunks.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
