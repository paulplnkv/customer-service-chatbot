import { randomUUID } from "node:crypto";
import { POST } from "@/app/api/chat/route";

export type ChatToolCall = {
  name: string;
  input: unknown;
  output?: unknown;
};

export type ChatResult = {
  conversationId: string;
  text: string;
  toolCalls: ChatToolCall[];
  status: number;
  rawError?: string;
};

export type CallChatOptions = {
  message: string;
  conversationId?: string;
  /**
   * Anonymous session ID to use as the cookie. If omitted, a fresh one is generated
   * for each call so evals don't share state.
   */
  anonymousSessionId?: string;
  /**
   * Optional Better Auth session cookie value. When provided, the request is treated
   * as authenticated. Construct via the `signInForEval` helper.
   */
  authCookie?: string;
};

/**
 * Calls the chat API route handler in-process and returns the assembled assistant
 * response along with any tool calls observed in the stream.
 */
export async function callChat(opts: CallChatOptions): Promise<ChatResult> {
  const conversationId = opts.conversationId ?? randomUUID();
  const anonId = opts.anonymousSessionId ?? `eval-${randomUUID()}`;

  const cookieParts: string[] = [];
  if (opts.authCookie) cookieParts.push(opts.authCookie);
  cookieParts.push(`anonymous_session_id=${anonId}`);

  const body = {
    id: conversationId,
    message: {
      id: randomUUID(),
      role: "user" as const,
      parts: [{ type: "text" as const, text: opts.message }],
    },
  };

  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieParts.join("; "),
    },
    body: JSON.stringify(body),
  });

  const response = await POST(request);

  if (response.status >= 400 || !response.body) {
    return {
      conversationId,
      text: "",
      toolCalls: [],
      status: response.status,
      rawError: await response.text().catch(() => undefined),
    };
  }

  const { text, toolCalls } = await parseUIMessageStream(response.body);

  return {
    conversationId,
    text,
    toolCalls,
    status: response.status,
  };
}

/**
 * Parses an SSE-encoded UI message stream from the AI SDK and reconstructs
 * the final assistant text plus any tool call invocations.
 */
async function parseUIMessageStream(stream: ReadableStream<Uint8Array>): Promise<{
  text: string;
  toolCalls: ChatToolCall[];
}> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let text = "";
  const toolCalls: ChatToolCall[] = [];
  const toolCallsByCallId = new Map<string, ChatToolCall>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const event = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        processEvent(event, { onText: (t) => (text += t), toolCalls, toolCallsByCallId });
        separator = buffer.indexOf("\n\n");
      }
    }
    if (buffer.length > 0) {
      processEvent(buffer, { onText: (t) => (text += t), toolCalls, toolCallsByCallId });
    }
  } finally {
    reader.releaseLock();
  }

  return { text, toolCalls };
}

function processEvent(
  event: string,
  ctx: {
    onText: (text: string) => void;
    toolCalls: ChatToolCall[];
    toolCallsByCallId: Map<string, ChatToolCall>;
  }
) {
  for (const line of event.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice("data: ".length);
    if (data === "[DONE]") continue;

    let chunk: { type: string; [key: string]: unknown };
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }

    switch (chunk.type) {
      case "text-delta":
        if (typeof chunk.delta === "string") ctx.onText(chunk.delta);
        break;
      case "tool-input-available": {
        const callId = chunk.toolCallId as string;
        const toolCall: ChatToolCall = {
          name: chunk.toolName as string,
          input: chunk.input,
        };
        ctx.toolCalls.push(toolCall);
        ctx.toolCallsByCallId.set(callId, toolCall);
        break;
      }
      case "tool-output-available": {
        const callId = chunk.toolCallId as string;
        const existing = ctx.toolCallsByCallId.get(callId);
        if (existing) existing.output = chunk.output;
        break;
      }
    }
  }
}
