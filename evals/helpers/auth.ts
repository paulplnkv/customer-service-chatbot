import { auth } from "@/lib/auth";

/**
 * All seeded test users from `scripts/seed-pas.ts`.
 * Run `npm run db:seed:pas` before running authenticated evals.
 */
export const SEED_USERS = {
  harrington: { email: "robert.harrington@example.com", password: "password123" },
  charter: { email: "ops@pinnacleaircharter.example", password: "password123" },
  apex: { email: "risk@apexaerospace.example", password: "password123" },
  skygate: { email: "insurance@skygate-fbo.example", password: "password123" },
  skyview: { email: "ops@skyview-analytics.example", password: "password123" },
  deltaag: { email: "office@deltaag-aviation.example", password: "password123" },
  cascade: { email: "board@cascaderidgefc.example", password: "password123" },
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
  user: SeedUserKey | { email: string; password: string } = "harrington"
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
