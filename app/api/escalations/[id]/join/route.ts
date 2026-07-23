import { revalidatePath } from "next/cache";
import { getEscalationById, setEscalationLive } from "@/lib/db/escalations";
import { saveMessage } from "@/lib/db/messages";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A support agent picks up an escalation and joins the customer's chat. Posts
// the agent's opening message and flips the escalation to "live" — from here the
// customer's turns are routed to the agent instead of the AI.
//
// NOTE: internal agent action. In production this must be behind agent auth; the
// demo leaves the back office open (like /api/internal-chat).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return new Response("Invalid escalation ID", { status: 400 });
  }

  const { agentName, intro } = (await req.json()) as {
    agentName?: string;
    intro?: string;
  };

  const escalation = await getEscalationById(id);
  if (!escalation) {
    return new Response("Not found", { status: 404 });
  }
  if (escalation.status === "resolved") {
    return new Response("This escalation is already resolved", { status: 409 });
  }

  const name = agentName?.trim() || "a Sterling specialist";
  const firstName = escalation.customerName?.trim().split(/\s+/)[0] ?? "there";
  const text =
    intro?.trim() ||
    `Hi ${firstName}, I'm ${name} from Sterling. I've picked up your case and have your policy and claim details in front of me — let's get this straightened out.`;

  const message = await saveMessage(escalation.conversationId, "agent", text, name);
  await setEscalationLive({ id, agentName: name });

  revalidatePath("/escalations");
  revalidatePath(`/escalations/${id}`);

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
