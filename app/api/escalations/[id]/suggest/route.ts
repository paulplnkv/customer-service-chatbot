import { generateText } from "ai";
import { chatModel } from "@/lib/ai/provider";
import { getEscalationById } from "@/lib/db/escalations";
import { getFullCustomerData } from "@/lib/db/pas";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Draft a suggested reply for the human agent. Grounded ONLY in the escalation
// reason, the conversation summary, and the customer's policy/claims record.
// Returns a draft note the specialist can edit before sending; the /respond
// route then turns the final note into a customer-facing recap.
//
// NOTE: internal agent action — in production this must require agent auth.
export async function POST(
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

  const fullData = escalation.userId
    ? await getFullCustomerData(escalation.userId)
    : null;

  // Build a compact, grounded context for the model.
  const lines: string[] = [`Escalation reason: ${escalation.reason}`];
  if (escalation.chatSummary) {
    lines.push(`Conversation summary: ${escalation.chatSummary}`);
  }
  if (fullData) {
    const c = fullData.customer;
    lines.push(`Customer: ${c.firstName} ${c.lastName}`);
    for (const p of fullData.policies) {
      lines.push(
        `Policy ${p.policyNumber} — ${p.type}, ${p.status}, deductible $${p.deductible}, term ${p.startDate} to ${p.endDate}`
      );
      for (const claim of p.claims) {
        const parts = [
          `claim ${claim.claimNumber}`,
          claim.type,
          `status ${claim.status}`,
        ];
        if (claim.amount) parts.push(`amount $${claim.amount}`);
        if (claim.paymentStatus)
          parts.push(
            `payment ${claim.paymentStatus}${claim.paymentDate ? ` (${claim.paymentDate})` : ""}`
          );
        if (claim.dateFiled) parts.push(`filed ${claim.dateFiled}`);
        if (claim.description) parts.push(`note: ${claim.description}`);
        lines.push(`  - ${parts.join(", ")}`);
      }
    }
  } else {
    lines.push("Customer: anonymous chat — no linked account record.");
  }

  let suggestion: string;
  try {
    const result = await generateText({
      model: chatModel,
      system:
        "You are an experienced Sterling Auto Insurance claims specialist. A case has been escalated from the AI assistant to you. Using ONLY the facts provided (escalation reason, conversation summary, and the customer's policy and claims record), draft a concise reply note — your guidance for the customer that a colleague will relay to them. Acknowledge the concern, explain the situation grounded strictly in the provided facts, and give clear, concrete next steps. Do NOT invent policy facts, amounts, dates, or coverage details that aren't provided; if something is unknown, say it will be confirmed. Be professional, empathetic, and specific. Keep it under 120 words. Write in the first person as the specialist; do not add a greeting line or a signature.",
      prompt: `${lines.join("\n")}\n\nDraft the reply note now.`,
    });
    suggestion = result.text.trim();
  } catch (err) {
    console.error("Escalation suggestion generation failed:", err);
    return new Response("Could not generate a suggestion", { status: 502 });
  }

  return Response.json({ suggestion });
}
