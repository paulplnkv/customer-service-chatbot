import { auth } from "@/lib/auth";

/**
 * All seeded test users from `scripts/seed-pas.ts`.
 * Run `npm run db:seed:pas` before running authenticated evals.
 */
export const SEED_USERS = {
  jane: { email: "jane.smith@example.com", password: "password123" },
  robert: { email: "robert.johnson@example.com", password: "password123" },
  maria: { email: "maria.garcia@example.com", password: "password123" },
  david: { email: "david.chen@example.com", password: "password123" },
  sarah: { email: "sarah.williams@example.com", password: "password123" },
} as const;

export type SeedUserKey = keyof typeof SEED_USERS;

/**
 * Signs in via Better Auth's in-process API and returns the session cookie
 * header value (e.g., "better-auth.session_token=..."). Pass this to
 * `callChat({ authCookie })` to make the request authenticated.
 *
 * Memoized per email so we only pay the bcrypt cost once per user per process.
 */
const cookieCache = new Map<string, string>();

export async function signInForEval(
  user: SeedUserKey | { email: string; password: string } = "jane"
): Promise<string> {
  const credentials = typeof user === "string" ? SEED_USERS[user] : user;
  const cached = cookieCache.get(credentials.email);
  if (cached) return cached;

  const { headers } = await auth.api.signInEmail({
    body: credentials,
    returnHeaders: true,
  });

  const setCookie = headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("signInForEval: no set-cookie header returned from Better Auth");
  }

  const cookiePair = setCookie.split(";")[0];
  if (!cookiePair) {
    throw new Error(`signInForEval: malformed set-cookie header: ${setCookie}`);
  }

  cookieCache.set(credentials.email, cookiePair);
  return cookiePair;
}
