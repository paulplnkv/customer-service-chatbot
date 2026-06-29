"use client";

import { X, Sparkles, SquarePen } from "lucide-react";
import type { UIMessage } from "@ai-sdk/react";
import { ChatInterface } from "@/components/chat/chat-interface";

/**
 * The assistant, presented as a sheet that slides up inside the phone frame.
 * Stays mounted so the conversation (and live agent recap polling) persists
 * while the sheet is closed.
 */
export function AssistantSheet({
  open,
  onClose,
  conversationId,
  initialMessages,
}: {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  initialMessages?: UIMessage[];
}) {
  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col bg-paper transition-transform duration-300 ease-out ${
        open ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!open}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-ink" />
          <div className="leading-tight">
            <div className="text-[13.5px] font-medium">Sterling Assistant</div>
            <div className="text-[11px] text-muted-foreground">AI · always-on</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("new-chat"))}
            aria-label="New chat"
            title="New chat"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink"
          >
            <SquarePen size={17} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close assistant"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatInterface
          compact
          conversationId={conversationId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
