import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { claims, claimDocuments } from "../db/schema/pas";
import { eq, inArray } from "drizzle-orm";
import { CLAIM_DOCUMENTS } from "./data/claim-documents";

// Attaches case documents/photos to claims that already exist, matched by claim
// number. Unlike seed-pas.ts this is ADDITIVE and idempotent: it only replaces
// the documents of the claims it names and never touches customers, policies,
// vehicles, claims, coverages, conversations or escalations.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  const claimNumbers = Object.keys(CLAIM_DOCUMENTS);
  console.log(`Seeding case documents for ${claimNumbers.length} claim(s)...\n`);

  const targets = await db
    .select({ id: claims.id, claimNumber: claims.claimNumber })
    .from(claims)
    .where(inArray(claims.claimNumber, claimNumbers));

  const found = new Set(targets.map((t) => t.claimNumber));
  for (const cn of claimNumbers) {
    if (!found.has(cn)) {
      console.warn(`  ! claim ${cn} not found — skipping (run db:seed:pas first?)`);
    }
  }

  for (const target of targets) {
    const docs = CLAIM_DOCUMENTS[target.claimNumber];

    // Idempotent: clear this claim's documents, then insert the current set.
    await db.delete(claimDocuments).where(eq(claimDocuments.claimId, target.id));
    await db.insert(claimDocuments).values(
      docs.map((d) => ({
        claimId: target.id,
        kind: d.kind,
        title: d.title,
        url: d.url,
        docDate: d.docDate,
      }))
    );

    const photos = docs.filter((d) => d.kind === "photo").length;
    const documents = docs.length - photos;
    console.log(
      `  ${target.claimNumber}: ${photos} photo(s), ${documents} document(s)`
    );
  }

  console.log("\nDone.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Claim-document seed failed:", err);
  process.exit(1);
});
