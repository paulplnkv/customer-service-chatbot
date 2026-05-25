import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";

export type SessionIdentity = {
  userId: string | null;
  anonymousSessionId: string | null;
};

export async function resolveSessionFromRequest(
  request: Request
): Promise<SessionIdentity> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session?.user?.id) {
    return { userId: session.user.id, anonymousSessionId: null };
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/anonymous_session_id=([^;]+)/);
  const anonId = match?.[1] ?? null;

  return { userId: null, anonymousSessionId: anonId };
}

export async function resolveSessionFromHeaders(): Promise<SessionIdentity> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    return { userId: session.user.id, anonymousSessionId: null };
  }

  const cookieStore = await cookies();
  const anonId = cookieStore.get("anonymous_session_id")?.value ?? null;

  return { userId: null, anonymousSessionId: anonId };
}
