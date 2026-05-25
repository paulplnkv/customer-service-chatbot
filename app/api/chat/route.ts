import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { chatModel } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { buildChatTools } from "@/lib/ai/tools";
import { resolveSessionFromRequest } from "@/lib/session";
import {
  createConversation,
  updateConversationTitle,
  touchConversation,
  conversationExists,
  getConversationWithMessages,
} from "@/lib/db/conversations";
import {
  saveMessage,
  getMessages,
  dbMessagesToUIMessages,
  uiMessageToText,
} from "@/lib/db/messages";
import { detectPII, sanitizeText } from "@/lib/security/pii-detection";
import { validateOutput } from "@/lib/security/output-validation";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 10000;

export async function POST(req: Request) {
  const { message, id: chatId } = (await req.json()) as {
    message: UIMessage;
    id: string;
  };

  // Validate chat ID format
  if (!chatId || !UUID_REGEX.test(chatId)) {
    return new Response("Invalid conversation ID", { status: 400 });
  }

  // Validate message content length
  const userText = uiMessageToText(message);
  if (!userText || userText.length > MAX_MESSAGE_LENGTH) {
    return new Response("Message is empty or too long", { status: 400 });
  }

  // PII detection on user input
  const piiResult = detectPII(userText);
  if (piiResult.detected) {
    console.warn(
      `[PII detected] types=${piiResult.types.join(",")} conversation=${chatId} sanitized="${sanitizeText(userText).substring(0, 100)}"`
    );
  }

  const identity = await resolveSessionFromRequest(req);
  if (!identity.userId && !identity.anonymousSessionId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check conversation ownership
  const existing = await getConversationWithMessages(chatId, identity);
  let isNewConversation = false;

  if (!existing) {
    // Conversation doesn't exist for this user — check if it exists at all
    if (await conversationExists(chatId)) {
      return new Response("Forbidden", { status: 403 });
    }
    // Create new conversation with client-provided ID
    await createConversation(identity, undefined, chatId);
    isNewConversation = true;
  }

  // Save user message
  await saveMessage(chatId, "user", userText);

  // Load full message history from DB
  const dbMessages = await getMessages(chatId);
  const uiMessages = dbMessagesToUIMessages(dbMessages);

  const isAuthenticated = !!identity.userId;

  // Build tools object — getCustomerPolicyData only for authenticated users
  const tools = buildChatTools(isAuthenticated);

  let systemPrompt = buildSystemPrompt(isAuthenticated);
  if (piiResult.detected) {
    systemPrompt += `\n\n## URGENT — PII Detected in Latest Message\nThe user's latest message contains sensitive personal information (${piiResult.types.join(", ")}). You MUST start your response with the following warning before answering their question:\n\n"${piiResult.warningMessage}"`;
  }

  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: await convertToModelMessages(uiMessages),
    tools,
    stopWhen: stepCountIs(5),
    experimental_context: {
      conversationId: chatId,
      ...(isAuthenticated ? { userId: identity.userId } : {}),
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "chat-stream",
      metadata: {
        conversationId: chatId,
        userId: identity.userId ?? "anonymous",
        sessionId: identity.anonymousSessionId ?? identity.userId ?? "unknown",
        langfuseSessionId: chatId,
        langfuseUserId:
          identity.userId ?? `anon-${identity.anonymousSessionId}`,
        isAuthenticated,
        piiDetected: piiResult.detected,
      },
    },
  });

  // Consume stream to ensure onFinish fires even if client disconnects
  result.consumeStream();

  // Fire-and-forget title generation for new conversations
  if (isNewConversation) {
    generateText({
      model: chatModel,
      prompt: `Generate a concise 3-6 word title for a customer service conversation that starts with this message: "${userText}". Return ONLY the title, no quotes or extra punctuation.`,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "title-generation",
        metadata: {
          conversationId: chatId,
          langfuseSessionId: chatId,
        },
      },
    })
      .then(async (titleResult) => {
        await updateConversationTitle(chatId, titleResult.text.trim());
      })
      .catch(console.error);
  } else {
    touchConversation(chatId).catch(console.error);
  }

  // Persist PII warning as a separate message so it appears in conversation history
  if (piiResult.detected && piiResult.warningMessage) {
    await saveMessage(chatId, "assistant", piiResult.warningMessage);
  }

  return result.toUIMessageStreamResponse({
    originalMessages: uiMessages,
    onFinish: async ({ messages: finalMessages }) => {
      const existingIds = new Set(dbMessages.map((m) => m.id));
      for (const msg of finalMessages) {
        if (msg.role === "assistant" && !existingIds.has(msg.id)) {
          let text = msg.parts
            .filter(
              (p): p is { type: "text"; text: string } => p.type === "text"
            )
            .map((p) => p.text)
            .join("");

          if (text) {
            // Validate LLM output for signs of prompt injection success
            const validation = validateOutput(text);
            if (!validation.isValid) {
              console.warn(
                `[Output validation failed] violations=${validation.violations.join(",")} conversation=${chatId}`
              );
              // Replace compromised response in saved history
              text = validation.replacementMessage!;
            }

            await saveMessage(chatId, "assistant", text);
          }
        }
      }
    },
  });
}
