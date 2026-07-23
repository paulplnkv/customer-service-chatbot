import { getEscalationById } from "@/lib/db/escalations";
import { getMessages } from "@/lib/db/messages";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the agent console: the full transcript of the customer's
// conversation plus the escalation's current status. The console replaces its
// view with this on every poll, so it always matches the database.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return new Response("Invalid escalation ID", { status: 400 });
  }

  const escalation = await getEscalationById(id);
  if (!escalation) {
    return new Response("Not found", { status: 404 });
  }

  const messages = await getMessages(escalation.conversationId);

  return Response.json({
    status: escalation.status,
    agentName: escalation.agentName,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      agentName: m.agentName,
      createdAt: m.createdAt,
    })),
  });
}
