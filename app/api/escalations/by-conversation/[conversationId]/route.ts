import { resolveSessionFromRequest } from "@/lib/session";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { getEscalationByConversationId } from "@/lib/db/escalations";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the customer chat after it escalates. Returns the escalation status
// for this conversation, and — once a support agent has responded — the recap
// (the latest assistant message) so the chat can surface it live.
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
    return Response.json({ status: null });
  }

  if (escalation.status === "resolved") {
    const lastAssistant = [...result.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return Response.json({
      status: "resolved",
      agentName: escalation.agentName ?? null,
      recap: lastAssistant?.content ?? null,
      recapId: lastAssistant?.id ?? null,
    });
  }

  return Response.json({ status: escalation.status });
}
