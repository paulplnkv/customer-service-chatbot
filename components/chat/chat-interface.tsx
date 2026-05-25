"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useMemo, useCallback, useState, Fragment } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { RefreshCcwIcon, CopyIcon, ShieldCheck } from "lucide-react";
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
  "What types of coverage are available?",
  "How do I file a claim?",
  "What's the status of my policy and vehicles?",
  "My claim was denied and I need to speak with someone",
];

export function ChatInterface({
  conversationId,
  initialMessages,
  escalation,
}: {
  conversationId?: string;
  initialMessages?: UIMessage[];
  escalation?: { reason: string; status: string };
}) {
  const hasNavigated = useMemo(() => ({ current: !!conversationId }), [conversationId]);
  const [input, setInput] = useState("");

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const greeting = sessionPending
    ? "Hello!"
    : session?.user?.name
      ? `Hello, ${session.user.name}!`
      : "Hello!";

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
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim()) {
      sendMessage({ text: message.text });
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

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
    async (toolCallId: string, reason: string) => {
      updateEscalationToolPart(toolCallId, "confirmed");
      try {
        const res = await fetch("/api/escalations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: chatId, reason }),
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

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          <Message from="assistant">
            <MessageContent>
              <div className="space-y-3 text-sm">
                <p>
                  {greeting} I&apos;m the Pinnacle Home &amp; Auto virtual assistant
                  — an AI-powered chatbot. I can help you with your policy
                  status, billing information, claims, and general questions
                  about our products.
                </p>
                <p className="text-muted-foreground">
                  Please note: I am an AI and may not be able to assist with
                  all requests. For complex or sensitive matters, please
                  contact our team directly at{" "}
                  <a
                    href="mailto:support@pinnaclehomeauto.com"
                    className="underline text-primary"
                  >
                    support@pinnaclehomeauto.com
                  </a>{" "}
                  or call{" "}
                  <a
                    href="tel:1-800-PINNACLE"
                    className="underline text-primary"
                  >
                    1-800-PINNACLE
                  </a>{" "}
                  (Mon–Fri, 9am–6pm).
                </p>
                <p className="font-medium">How can I help you today?</p>
              </div>
            </MessageContent>
          </Message>
          {messages.length === 0 ? (
            <Suggestions className="justify-center gap-2 pt-2">
              {suggestions.map((s) => (
                <Suggestion
                  key={s}
                  suggestion={s}
                  onClick={handleSuggestionClick}
                  className="text-xs"
                />
              ))}
            </Suggestions>
          ) : (
            messages.map((message, messageIndex) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text": {
                      const isLastAssistant =
                        message.role === "assistant" &&
                        messageIndex === messages.length - 1;
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                          </Message>
                          {isLastAssistant && status !== "streaming" && (
                            <MessageActions className="-mt-4">
                              <MessageAction
                                onClick={() => regenerate()}
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </MessageAction>
                              <MessageAction
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </MessageAction>
                            </MessageActions>
                          )}
                        </Fragment>
                      );
                    }
                    case "tool-escalateToHuman": {
                      const escalation = part as EscalationToolPart;
                      const reason =
                        escalation.state === "input-available" || escalation.state === "output-available"
                          ? escalation.input.reason
                          : "Connecting you with a human agent...";
                      const toolCallId = escalation.toolCallId;
                      return (
                        <div key={`${message.id}-${i}`} className="w-full max-w-md">
                          <EscalationConfirmation
                            reason={reason}
                            state={escalation.state}
                            output={escalation.state === "output-available" ? String(escalation.output) : undefined}
                            onConfirm={() => handleEscalationConfirm(toolCallId, reason)}
                            onDismiss={() => handleEscalationDismiss(toolCallId)}
                          />
                        </div>
                      );
                    }
                    default: {
                      if (
                        part.type.startsWith("tool-") &&
                        "state" in part
                      ) {
                        const toolName = part.type.replace("tool-", "");
                        const label =
                          toolLabels[toolName] ?? toolName;

                        if (part.state === "output-available") {
                          return null;
                        }

                        return (
                          <Message key={`${message.id}-${i}`} from="assistant">
                            <MessageContent>
                              <Shimmer className="text-sm" duration={1.5}>
                                {`${label}...`}
                              </Shimmer>
                            </MessageContent>
                          </Message>
                        );
                      }
                      return null;
                    }
                  }
                })}
              </Fragment>
            ))
          )}
          {escalation &&
            !messages.some((m) =>
              m.parts.some((p) => p.type === "tool-escalateToHuman")
            ) && (
              <div className="w-full max-w-md">
                <EscalationConfirmation
                  reason={escalation.reason}
                  state="output-available"
                  output="confirmed"
                  onConfirm={() => { }}
                  onDismiss={() => { }}
                />
              </div>
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
            <Message from="assistant">
              <MessageContent>
                <Shimmer className="text-sm" duration={1.5}>
                  Thinking...
                </Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t bg-background px-4 pb-4 pt-3">
        <PromptInput
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl relative"
        >
          <PromptInputTextarea
            value={input}
            placeholder="Ask about your policy, claims, or coverage..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
}
