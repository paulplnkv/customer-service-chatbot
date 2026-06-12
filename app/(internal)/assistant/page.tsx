"use client";

import { useMemo, useState, useRef, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Bot, User as UserIcon, Sparkles } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";

const SUGGESTIONS = [
  "Give me a portfolio snapshot",
  "What's in the escalation queue?",
  "Which policies are up for renewal soon?",
  "Show me our rotorcraft exposure",
  "Summarize open claims across the book",
  "Draft an indication for a new Citation CJ4 operator",
];

export default function InternalAssistantPage() {
  const [input, setInput] = useState("");
  const [chatId] = useState(() => crypto.randomUUID());
  const taRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/internal-chat",
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({ id: chatId, transport });
  const busy = status === "streaming" || status === "submitted";

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <section className="flex h-screen flex-col">
      <div className="border-b border-rule px-8 pb-4 pt-7">
        <div className="label-eyebrow">Back office · Underwriter tools</div>
        <h1 className="mt-0.5 flex items-center gap-2.5 font-display text-3xl">
          <Sparkles size={22} className="text-ink" />
          AI assistant
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Ask about the book of business, named accounts, the escalation queue,
          or draft underwriting indications.
        </p>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-[900px] gap-5 px-8 pb-8 pt-8">
          {empty ? (
            <div>
              <p className="text-[14px] leading-relaxed text-ink">
                Hi — I&apos;m your internal STARR Aviation copilot. I can help you
                reason over policy, claims, and escalation data, and draft
                underwriting indications. I won&apos;t take any binding actions on
                my own.
              </p>
              <p className="mt-6 text-[13px] text-muted-foreground">
                Pick one of the suggested questions below, or ask anything.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  if (part.type !== "text") return null;
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
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))
          )}

          {status === "submitted" && (
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

      <div className="shrink-0 border-t border-rule bg-card">
        <div className="mx-auto max-w-[900px] px-8 pt-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={busy}
                className="rounded-full border border-rule px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-[900px] px-8 pb-5 pt-3">
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
              placeholder="Ask about the portfolio, a policyholder, the escalation queue, renewals…"
              rows={2}
              className="max-h-40 min-h-[72px] w-full resize-none rounded-md border border-rule bg-paper px-3.5 py-3 pr-14 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
    </section>
  );
}
