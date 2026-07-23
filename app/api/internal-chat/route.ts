import {
  streamText,
  UIMessage,
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
} from "ai";
import { chatModel } from "@/lib/ai/provider";
import { buildInternalSystemPrompt } from "@/lib/ai/system-prompt";
import { buildInternalTools } from "@/lib/ai/tools";

// Back-office underwriter copilot. Stateless by design — internal assistant
// chats are ephemeral and not persisted (unlike the customer /api/chat).
export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  const result = streamText({
    model: chatModel,
    system: buildInternalSystemPrompt(),
    // The client keeps every tool call and its JSON result in the message list,
    // so a portfolio snapshot read minutes ago would still be in context — and
    // the model would answer from it after an agent edits the record in PAS.
    // Drop tool traffic from history so the only way to state a fact is to call
    // the tool again now. Only history is affected; the tools this run calls are
    // untouched.
    messages: pruneMessages({
      messages: await convertToModelMessages(messages),
      toolCalls: "all",
      emptyMessages: "remove",
    }),
    tools: buildInternalTools(),
    stopWhen: stepCountIs(5),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "internal-chat-stream",
    },
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse();
}
