import { db } from "@/db";
import { customers } from "@/db/schema/pas";

/**
 * Finds the first seeded customer's userId for testing.
 * Requires `npm run db:seed:pas` to have been run.
 */
export async function getSeededTestUserId(): Promise<string | null> {
  const [first] = await db.select({ userId: customers.userId }).from(customers).limit(1);
  return first?.userId ?? null;
}

export { db };
