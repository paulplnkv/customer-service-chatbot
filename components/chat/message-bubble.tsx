"use client";

import type { UIMessage } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";

export function MessageBubble({
  message,
  isLoading,
}: {
  message: UIMessage;
  isLoading?: boolean;
}) {
  const isUser = message.role === "user";

  const text = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isLoading && !text ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {text}
          </div>
        )}
      </div>
    </div>
  );
}
