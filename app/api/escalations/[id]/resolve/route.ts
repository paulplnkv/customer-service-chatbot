import { generateText } from "ai";
import { revalidatePath } from "next/cache";
import { chatModel } from "@/lib/ai/provider";
import {
  getEscalationById,
  resolveEscalationWithResponse,
} from "@/lib/db/escalations";
import { saveMessage } from "@/lib/db/messages";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The agent closes the live conversation: we turn their closing note into a warm
// recap with next steps, post it as the agent's final message, and mark the
// escalation resolved. The "sent to your email" line is appended deterministically
// so the customer always gets that confirmation regardless of what the model writes.
//
// NOTE: the email is simulated for the demo — nothing is actually sent.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return new Response("Invalid escalation ID", { status: 400 });
  }

  const { agentName, note } = (await req.json()) as {
    agentName?: string;
    note?: string;
  };

  if (!note || typeof note !== "string" || !note.trim()) {
    return new Response("A closing note is required", { status: 400 });
  }

  const escalation = await getEscalationById(id);
  if (!escalation) {
    return new Response("Not found", { status: 404 });
  }
  if (escalation.status === "resolved") {
    return new Response("This escalation is already resolved", { status: 409 });
  }

  const name =
    agentName?.trim() || escalation.agentName || "a Sterling specialist";

  // Compose the recap in the agent's own voice, grounded only in their note.
  const customerFirstName =
    escalation.customerName?.trim().split(/\s+/)[0] ?? "the customer";

  let recap: string;
  try {
    const result = await generateText({
      model: chatModel,
      system:
        `You are ${name}, a human claims specialist at Sterling Auto Insurance. You are writing your final message TO the customer, ${customerFirstName}, at the end of a live chat you have just had with them.\n\n` +
        "Rules:\n" +
        "- Write in the first person as the specialist, addressed to the customer.\n" +
        "- You are the specialist — never greet or address yourself by name.\n" +
        "- Do NOT open with a greeting or salutation; the conversation is already underway.\n" +
        "- Summarise what was agreed, then give clear next steps.\n" +
        "- Base it ONLY on the closing note below. Do not invent policy facts, amounts, or dates.\n" +
        "- Keep it under 130 words.\n" +
        "- Do not add a sign-off, signature, or any mention of email — that is appended separately.",
      prompt: `My closing note about this case:\n"""\n${note.trim()}\n"""\n\nWrite the final message to ${customerFirstName} now.`,
    });
    recap = result.text.trim();
  } catch (err) {
    console.error("Recap generation failed, falling back to raw note:", err);
    recap = note.trim();
  }

  const emailLine = escalation.customerEmail
    ? `I've also sent this recap and your action plan to ${escalation.customerEmail}.`
    : "I've also sent this recap and your action plan to the email address on your account.";

  const finalText = `${recap}\n\n${emailLine}`;

  await saveMessage(escalation.conversationId, "agent", finalText, name);
  await resolveEscalationWithResponse({
    id,
    agentName: name,
    agentResponse: note.trim(),
  });

  revalidatePath("/escalations");
  revalidatePath(`/escalations/${id}`);

  return Response.json({ ok: true, recap: finalText });
}
