import { resolveSessionFromRequest } from "@/lib/session";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { getEscalationByConversationId } from "@/lib/db/escalations";
import { saveMessage } from "@/lib/db/messages";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LENGTH = 4000;

// Used by the customer's chat while a human agent has taken over. It persists the
// customer's turn WITHOUT invoking the model, so the AI stays silent and the
// agent — who is polling the thread — answers instead.
//
// Only valid while the conversation's escalation is "live"; otherwise the client
// should go through /api/chat as usual.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return new Response("Invalid conversation ID", { status: 400 });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text || typeof text !== "string" || !text.trim()) {
    return new Response("A message is required", { status: 400 });
  }
  if (text.length > MAX_LENGTH) {
    return new Response("Message too long", { status: 400 });
  }

  const identity = await resolveSessionFromRequest(req);
  if (!identity.userId && !identity.anonymousSessionId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Ownership check.
  const conversation = await getConversationWithMessages(id, identity);
  if (!conversation) {
    return new Response("Forbidden", { status: 403 });
  }

  const escalation = await getEscalationByConversationId(id);
  if (!escalation || escalation.status !== "live") {
    return new Response("No agent is handling this conversation", {
      status: 409,
    });
  }

  const message = await saveMessage(id, "user", text.trim());

  return Response.json({
    ok: true,
    message: {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    },
  });
}
