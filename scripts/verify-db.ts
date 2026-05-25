import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

async function verify() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Test connection
    await pool.query("SELECT 1");
    console.log("✓ Database connection successful");

    // Check pgvector extension
    const extResult = await pool.query(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'"
    );
    if (extResult.rows.length > 0) {
      console.log("✓ pgvector extension is installed");
    } else {
      console.error("✗ pgvector extension is NOT installed");
      process.exit(1);
    }

    // List tables
    const tablesResult = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log(`✓ Found ${tablesResult.rows.length} table(s):`);
    for (const row of tablesResult.rows) {
      console.log(`  - ${row.tablename}`);
    }
  } catch (error) {
    console.error("✗ Verification failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
