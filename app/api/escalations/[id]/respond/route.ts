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

// A support agent submits a reply to an escalation. We turn their note into a
// customer-facing recap (in the assistant's voice), post it into the customer's
// conversation, and mark the escalation resolved. The customer's chat picks up
// the recap live via /api/escalations/by-conversation/[conversationId].
//
// NOTE: this is an internal agent action. In production it must be protected by
// agent authentication; the demo leaves the back office open (like /api/internal-chat).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return new Response("Invalid escalation ID", { status: 400 });
  }

  const { agentName, agentResponse } = (await req.json()) as {
    agentName?: string;
    agentResponse?: string;
  };

  if (!agentResponse || typeof agentResponse !== "string" || !agentResponse.trim()) {
    return new Response("A response is required", { status: 400 });
  }

  const escalation = await getEscalationById(id);
  if (!escalation) {
    return new Response("Not found", { status: 404 });
  }

  const name = (agentName && agentName.trim()) || "a Sterling specialist";

  // Compose a friendly, grounded recap in the assistant's voice.
  let recap: string;
  try {
    const result = await generateText({
      model: chatModel,
      system:
        "You are the Sterling Auto Insurance customer assistant. A human claims specialist has reviewed the customer's case and written a note for you to relay. Write a brief, warm recap addressed to the customer that (1) says the specialist reviewed their case, (2) summarizes the specialist's guidance, and (3) lists clear next steps. Base it ONLY on the specialist's note — do not invent policy facts, amounts, or dates. Keep it under 130 words, use the specialist's name if natural, and do not sign off with a placeholder signature.",
      prompt: `Specialist: ${name}\n\nSpecialist's note to relay to the customer:\n"""\n${agentResponse.trim()}\n"""`,
    });
    recap = result.text.trim();
  } catch (err) {
    console.error("Recap generation failed, falling back to raw note:", err);
    recap = `A specialist on our team (${name}) reviewed your case. Here's their guidance:\n\n${agentResponse.trim()}`;
  }

  // Persist the recap as an assistant message in the customer's conversation.
  await saveMessage(escalation.conversationId, "assistant", recap);

  await resolveEscalationWithResponse({
    id,
    agentName: name,
    agentResponse: agentResponse.trim(),
  });

  revalidatePath("/escalations");
  revalidatePath(`/escalations/${id}`);

  return Response.json({ ok: true, recap });
}
