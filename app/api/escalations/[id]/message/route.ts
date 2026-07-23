import { getEscalationById } from "@/lib/db/escalations";
import { saveMessage } from "@/lib/db/messages";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LENGTH = 4000;

// A live agent sends a message straight into the customer's chat. No LLM is
// involved — this is the human talking. The customer's chat picks it up on its
// next poll of /api/escalations/by-conversation/[conversationId].
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return new Response("Invalid escalation ID", { status: 400 });
  }

  const { agentName, text } = (await req.json()) as {
    agentName?: string;
    text?: string;
  };

  if (!text || typeof text !== "string" || !text.trim()) {
    return new Response("A message is required", { status: 400 });
  }
  if (text.length > MAX_LENGTH) {
    return new Response("Message too long", { status: 400 });
  }

  const escalation = await getEscalationById(id);
  if (!escalation) {
    return new Response("Not found", { status: 404 });
  }
  if (escalation.status !== "live") {
    return new Response("Join the chat before sending messages", {
      status: 409,
    });
  }

  const name =
    agentName?.trim() || escalation.agentName || "a Sterling specialist";

  const message = await saveMessage(
    escalation.conversationId,
    "agent",
    text.trim(),
    name
  );

  return Response.json({
    ok: true,
    message: {
      id: message.id,
      role: message.role,
      content: message.content,
      agentName: message.agentName,
      createdAt: message.createdAt,
    },
  });
}
