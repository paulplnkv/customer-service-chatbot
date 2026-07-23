import { resolveSessionFromRequest } from "@/lib/session";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { getEscalationByConversationId } from "@/lib/db/escalations";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the customer chat once it has escalated. Returns the escalation
// status plus every message written by the human agent, so the chat can surface
// a live back-and-forth (not just a single closing recap).
//
// Only role="agent" messages are returned: assistant turns already reach the
// client through the AI SDK stream, so including them here would duplicate them.
// The client de-duplicates by message id.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  if (!UUID_REGEX.test(conversationId)) {
    return new Response("Invalid conversation ID", { status: 400 });
  }

  const identity = await resolveSessionFromRequest(req);
  if (!identity.userId && !identity.anonymousSessionId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Ownership check (also gives us the messages).
  const result = await getConversationWithMessages(conversationId, identity);
  if (!result) {
    return new Response("Forbidden", { status: 403 });
  }

  const escalation = await getEscalationByConversationId(conversationId);
  if (!escalation) {
    return Response.json({ status: null, agentName: null, messages: [] });
  }

  const agentMessages = result.messages
    .filter((m) => m.role === "agent")
    .map((m) => ({
      id: m.id,
      content: m.content,
      agentName: m.agentName,
      createdAt: m.createdAt,
    }));

  return Response.json({
    status: escalation.status,
    agentName: escalation.agentName,
    messages: agentMessages,
  });
}
