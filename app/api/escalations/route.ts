import { resolveSessionFromRequest } from "@/lib/session";
import { createEscalation, getEscalationByConversationId } from "@/lib/db/escalations";
import { getMessages } from "@/lib/db/messages";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { getCustomerByUserId } from "@/lib/db/pas";
import { generateText } from "ai";
import { chatModel } from "@/lib/ai/provider";
import { revalidatePath } from "next/cache";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const {
    conversationId,
    reason,
    customerEmail: bodyEmail,
  } = (await req.json()) as {
    conversationId: string;
    reason: string;
    customerEmail?: string;
  };

  if (!conversationId || !UUID_REGEX.test(conversationId)) {
    return new Response("Invalid conversation ID", { status: 400 });
  }

  if (!reason || typeof reason !== "string") {
    return new Response("Reason is required", { status: 400 });
  }

  const identity = await resolveSessionFromRequest(req);
  if (!identity.userId && !identity.anonymousSessionId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify conversation ownership
  const conversation = await getConversationWithMessages(conversationId, identity);
  if (!conversation) {
    return new Response("Forbidden", { status: 403 });
  }

  // Prevent duplicate pending escalations
  const existing = await getEscalationByConversationId(conversationId);
  if (existing && existing.status === "pending") {
    return Response.json({
      id: existing.id,
      status: existing.status,
      createdAt: existing.createdAt,
    });
  }

  // Load recent messages for chat summary
  const messages = await getMessages(conversationId);
  const recentMessages = messages.slice(-10);
  const chatLog = recentMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  // Generate summary via LLM
  let chatSummary: string | null = null;
  try {
    const summaryResult = await generateText({
      model: chatModel,
      prompt: `Summarize this customer service conversation in 2-3 sentences for a human agent who will follow up. Focus on the customer's issue and what has been attempted so far.\n\n${chatLog}`,
    });
    chatSummary = summaryResult.text.trim();
  } catch {
    // Fall back to last few messages as summary
    chatSummary = recentMessages
      .slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
  }

  // Look up customer info if authenticated; otherwise use the email the
  // anonymous user supplied in the escalation widget so an agent can follow up.
  let customerName: string | null = null;
  let customerEmail: string | null = null;

  if (identity.userId) {
    const customer = await getCustomerByUserId(identity.userId);
    if (customer) {
      customerName = `${customer.firstName} ${customer.lastName}`;
      customerEmail = customer.email;
    }
  } else if (typeof bodyEmail === "string" && /^\S+@\S+\.\S+$/.test(bodyEmail.trim())) {
    customerEmail = bodyEmail.trim();
    customerName = customerEmail.split("@")[0];
  }

  const escalation = await createEscalation({
    conversationId,
    userId: identity.userId,
    customerName,
    customerEmail,
    chatSummary,
    reason,
  });

  revalidatePath("/escalations");

  return Response.json({
    id: escalation.id,
    status: escalation.status,
    createdAt: escalation.createdAt,
  });
}
