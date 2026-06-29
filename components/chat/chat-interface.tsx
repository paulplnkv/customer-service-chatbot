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

// Shown once the customer is signed in — specific to their policy and claims.
const accountSuggestions = [
  "What's the status of my claims?",
  "When will my approved payment arrive?",
  "Why was my collision claim denied?",
  "Can I renew so my denied claim gets approved?",
];

// Shown to signed-out / anonymous visitors — general questions the assistant
// can answer from the knowledge base without any account data.
const generalSuggestions = [
  "What does auto insurance cover?",
  "How do I file a claim?",
  "Collision vs. comprehensive coverage?",
  "How can I lower my premium?",
];

export function ChatInterface({
  conversationId,
  initialMessages,
  compact = false,
}: {
  conversationId?: string;
  initialMessages?: UIMessage[];
  compact?: boolean;
}) {
  const widthClass = compact ? "w-full px-4" : "mx-auto w-full max-w-[900px] px-6";
  const hasNavigated = useMemo(() => ({ current: !!conversationId }), [conversationId]);
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  const isAnonymous = !sessionPending && !session?.user;
  const suggestions = session?.user ? accountSuggestions : generalSuggestions;

  const [chatId, setChatId] = useState(
    () => conversationId ?? crypto.randomUUID()
  );

  // Live agent-recap loop: after the customer escalates, poll for the support
  // agent's reply and surface the assistant's recap in the open chat.
  const [escalationPending, setEscalationPending] = useState(false);
  const recapShownRef = useRef(false);

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
      setEscalationPending(false);
      recapShownRef.current = false;
    };
    window.addEventListener("new-chat", handler);
    return () => window.removeEventListener("new-chat", handler);
  }, [setMessages, hasNavigated]);

  // Let a mouse wheel scroll the horizontal suggestions row (vertical wheel →
  // horizontal). Attached natively because React's onWheel is passive and so
  // can't preventDefault.
  useEffect(() => {
    const el = suggestRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
        } else {
          recapShownRef.current = false;
          setEscalationPending(true);
        }
      } catch (err) {
        console.error("Escalation request error:", err);
      }
    },
    [chatId, updateEscalationToolPart]
  );

  // Poll for the support agent's reply while an escalation is pending, then
  // append the assistant's recap to the conversation.
  useEffect(() => {
    if (!escalationPending) return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/escalations/by-conversation/${chatId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: string | null;
          recap?: string | null;
          recapId?: string | null;
        };
        if (data.status === "resolved" && active && !recapShownRef.current) {
          recapShownRef.current = true;
          setEscalationPending(false);
          if (data.recap) {
            setMessages((prev) => [
              ...prev,
              {
                id: data.recapId ?? crypto.randomUUID(),
                role: "assistant" as const,
                parts: [{ type: "text" as const, text: data.recap as string }],
              },
            ]);
          }
        }
      } catch {
        // transient network error — keep polling
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [escalationPending, chatId, setMessages]);

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
        <ConversationContent className={`${widthClass} gap-5 pb-8 pt-6`}>
          {empty ? (
            <div>
              <p className="text-[15px] leading-relaxed text-ink">
                {isAnonymous
                  ? "Hi! I'm the Sterling Auto Insurance assistant."
                  : `Hi ${firstName ?? "there"}! I'm the Sterling Auto Insurance assistant.`}{" "}
                I can help with your policy, claims and payouts, billing,
                renewals, and coverage. For anything I can&apos;t handle, I&apos;ll
                connect you with a specialist.
              </p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
                I&apos;m an AI assistant. For urgent matters you can also reach our
                team at{" "}
                <a
                  href="mailto:support@sterlingauto.example"
                  className="text-ink underline underline-offset-2"
                >
                  support@sterlingauto.example
                </a>{" "}
                or our 24/7 claims line{" "}
                <a
                  href="tel:1-800-555-0199"
                  className="text-ink underline underline-offset-2"
                >
                  1-800-555-0199
                </a>
                .
              </p>
              {isAnonymous && (
                <p className="mt-6 text-[12px] text-muted-foreground">
                  Sign in from the home screen to ask about your own policy,
                  vehicles, and claims.
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

          {escalationPending && (
            <div className="flex items-start gap-3">
              <span className="mt-1 text-muted-foreground">
                <Bot size={14} />
              </span>
              <Shimmer className="text-[14px]" duration={1.6}>
                A specialist is reviewing your case…
              </Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t border-rule bg-paper">
        <div className={`${widthClass} pt-4`}>
          <div
            ref={suggestRef}
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={busy}
                className="shrink-0 whitespace-nowrap rounded-full border border-rule px-3 py-1 text-[11.5px] text-ink transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className={`${widthClass} py-5`}>
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
