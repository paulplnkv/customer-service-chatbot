"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useCallback, useState, useRef, Fragment } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ArrowUp, Bot, User as UserIcon, RefreshCcw, Copy } from "lucide-react";
import { EscalationConfirmation } from "@/components/chat/escalation-confirmation";
import { authClient } from "@/lib/auth-client";

type EscalationToolPart = {
  type: "tool-escalateToHuman";
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input: { reason: string };
  output?: unknown;
};

const toolLabels: Record<string, string> = {
  searchKnowledgeBase: "Searching knowledge base",
  getCustomerPolicyData: "Looking up your policy details",
};

const suggestions = [
  "What types of aviation coverage are available?",
  "How do I file a claim?",
  "What's the status of my policy and aircraft?",
  "My claim was denied and I need to speak with someone",
];

export function ChatInterface({
  conversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages?: UIMessage[];
}) {
  const hasNavigated = useMemo(() => ({ current: !!conversationId }), [conversationId]);
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  const isAnonymous = !sessionPending && !session?.user;

  const [chatId, setChatId] = useState(
    () => conversationId ?? crypto.randomUUID()
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages, id }) {
          return {
            body: { message: messages[messages.length - 1], id },
          };
        },
      }),
    []
  );

  const { messages, setMessages, sendMessage, status, regenerate } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: useCallback(() => { }, []),
  });

  useEffect(() => {
    if (!hasNavigated.current && messages.length >= 2 && status === "ready") {
      hasNavigated.current = true;
      window.dispatchEvent(
        new CustomEvent("conversation-created", {
          detail: { id: chatId },
        })
      );
    }
  }, [chatId, messages.length, hasNavigated, status]);

  useEffect(() => {
    const handler = () => {
      setChatId(crypto.randomUUID());
      setMessages([]);
      setInput("");
      hasNavigated.current = false;
    };
    window.addEventListener("new-chat", handler);
    return () => window.removeEventListener("new-chat", handler);
  }, [setMessages, hasNavigated]);

  const busy = status === "streaming" || status === "submitted";

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  const updateEscalationToolPart = useCallback(
    (toolCallId: string, output: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const hasMatch = msg.parts.some(
            (p) =>
              p.type === "tool-escalateToHuman" &&
              "toolCallId" in p &&
              (p as EscalationToolPart).toolCallId === toolCallId
          );
          if (!hasMatch) return msg;
          return {
            ...msg,
            parts: msg.parts.map((part) => {
              if (
                part.type === "tool-escalateToHuman" &&
                "toolCallId" in part &&
                (part as EscalationToolPart).toolCallId === toolCallId
              ) {
                Object.assign(part, { state: "output-available", output });
              }
              return part;
            }),
          } as typeof msg;
        })
      );
    },
    [setMessages]
  );

  const handleEscalationConfirm = useCallback(
    async (toolCallId: string, reason: string, email?: string) => {
      updateEscalationToolPart(toolCallId, "confirmed");
      try {
        const res = await fetch("/api/escalations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: chatId,
            reason,
            ...(email ? { customerEmail: email } : {}),
          }),
        });
        if (!res.ok) {
          console.error("Escalation request failed:", res.status);
        }
      } catch (err) {
        console.error("Escalation request error:", err);
      }
    },
    [chatId, updateEscalationToolPart]
  );

  const handleEscalationDismiss = useCallback(
    (toolCallId: string) => {
      updateEscalationToolPart(toolCallId, "dismissed");
    },
    [updateEscalationToolPart]
  );

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-paper">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-[900px] gap-5 px-6 pb-8 pt-8">
          {empty ? (
            <div>
              <p className="text-[15px] leading-relaxed text-ink">
                Hello! I&apos;m the STARR Aviation Insurance virtual assistant — an
                AI-powered chatbot. I can help you with your aircraft policy,
                coverage and endorsements, billing, claims, and general questions
                about our general aviation products.
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                Please note: I am an AI and may not be able to assist with all
                requests. For complex or sensitive matters, please contact our
                team directly at{" "}
                <a
                  href="mailto:support@str-aviation.example"
                  className="text-ink underline underline-offset-2"
                >
                  support@str-aviation.example
                </a>{" "}
                or call our 24/7 aviation claims line{" "}
                <a
                  href="tel:1-800-555-0147"
                  className="text-ink underline underline-offset-2"
                >
                  1-800-555-0147
                </a>
                .
              </p>
              <h2 className="mt-8 text-[15px] font-semibold text-ink">
                {isAnonymous
                  ? "How can I help you today?"
                  : `Hello ${firstName ?? "there"} — how can I help today?`}
              </h2>
              {isAnonymous && (
                <p className="mt-8 text-[12px] text-muted-foreground">
                  <button
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent("open-auth"))
                    }
                    className="text-ink underline underline-offset-4"
                  >
                    Sign in
                  </button>{" "}
                  to ask about your own policies, aircraft, and claims.
                </p>
              )}
            </div>
          ) : (
            messages.map((message, messageIndex) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text": {
                      if (message.role === "user") {
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="flex items-start justify-end gap-3"
                          >
                            <div className="max-w-[78%] whitespace-pre-wrap rounded-md bg-ink px-3.5 py-2.5 text-[14px] leading-relaxed text-paper">
                              {part.text}
                            </div>
                            <span className="mt-1 text-muted-foreground">
                              <UserIcon size={14} />
                            </span>
                          </div>
                        );
                      }
                      const isLastAssistant =
                        message.role === "assistant" &&
                        messageIndex === messages.length - 1;
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="flex items-start gap-3"
                        >
                          <span className="mt-1 text-muted-foreground">
                            <Bot size={14} />
                          </span>
                          <div className="max-w-[78%] flex-1">
                            <MessageResponse className="text-[14px] leading-relaxed">
                              {part.text}
                            </MessageResponse>
                            {isLastAssistant && status !== "streaming" && (
                              <div className="mt-2 flex items-center gap-1">
                                <button
                                  onClick={() => regenerate()}
                                  aria-label="Retry"
                                  className="p-1 text-muted-foreground hover:text-ink"
                                >
                                  <RefreshCcw size={13} />
                                </button>
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                  aria-label="Copy"
                                  className="p-1 text-muted-foreground hover:text-ink"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    case "tool-escalateToHuman": {
                      const esc = part as EscalationToolPart;
                      const reason =
                        esc.state === "input-available" ||
                        esc.state === "output-available"
                          ? esc.input.reason
                          : "Connecting you with a human agent...";
                      const toolCallId = esc.toolCallId;
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="flex items-start gap-3"
                        >
                          <span className="mt-1 text-muted-foreground">
                            <Bot size={14} />
                          </span>
                          <div className="max-w-md flex-1">
                            <EscalationConfirmation
                              reason={reason}
                              state={esc.state}
                              output={
                                esc.state === "output-available"
                                  ? String(esc.output)
                                  : undefined
                              }
                              isAnonymous={isAnonymous}
                              onConfirm={(email) =>
                                handleEscalationConfirm(toolCallId, reason, email)
                              }
                              onDismiss={() => handleEscalationDismiss(toolCallId)}
                            />
                          </div>
                        </div>
                      );
                    }
                    default: {
                      if (part.type.startsWith("tool-") && "state" in part) {
                        const toolName = part.type.replace("tool-", "");
                        const label = toolLabels[toolName] ?? toolName;
                        if (part.state === "output-available") return null;
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="flex items-start gap-3"
                          >
                            <span className="mt-1 text-muted-foreground">
                              <Bot size={14} />
                            </span>
                            <Shimmer className="text-[14px]" duration={1.5}>
                              {`${label}...`}
                            </Shimmer>
                          </div>
                        );
                      }
                      return null;
                    }
                  }
                })}
              </Fragment>
            ))
          )}

          {(status === "submitted" ||
            (status !== "ready" &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              messages[messages.length - 1].parts.every(
                (p) =>
                  !p.type.startsWith("tool-") ||
                  ("state" in p && p.state === "output-available")
              ) &&
              !messages[messages.length - 1].parts.some(
                (p) => p.type === "text"
              ))) && (
            <div className="flex items-start gap-3">
              <span className="mt-1 text-muted-foreground">
                <Bot size={14} />
              </span>
              <Shimmer className="text-[14px]" duration={1.5}>
                Thinking…
              </Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t border-rule bg-paper">
        <div className="mx-auto max-w-[900px] px-6 pt-4">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={busy}
                className="rounded-full border border-rule px-3.5 py-1.5 text-[12.5px] text-ink transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-[900px] px-6 py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="relative"
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your policy, claims, or coverage…"
              rows={2}
              className="max-h-40 min-h-[72px] w-full resize-none rounded-md border border-rule bg-secondary/50 px-3.5 py-3 pr-14 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              <ArrowUp size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
