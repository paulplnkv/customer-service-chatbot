import {
  streamText,
  UIMessage,
  convertToModelMessages,
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
    messages: await convertToModelMessages(messages),
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
