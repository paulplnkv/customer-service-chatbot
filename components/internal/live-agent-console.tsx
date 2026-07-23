"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Headset, Sparkles } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ThreadMessage = {
  id: string;
  role: string;
  content: string;
  agentName: string | null;
  createdAt: string;
};

const POLL_MS = 3000;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LiveAgentConsole({
  escalationId,
  customerName,
  initialStatus,
  initialAgentName,
  initialMessages,
}: {
  escalationId: string;
  customerName: string | null;
  initialStatus: string;
  initialAgentName: string | null;
  initialMessages: ThreadMessage[];
}) {
  const router = useRouter();

  const [status, setStatus] = useState(initialStatus);
  const [agentName, setAgentName] = useState(initialAgentName ?? "");
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);

  const [draft, setDraft] = useState("");
  const [intro, setIntro] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [showClose, setShowClose] = useState(false);

  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = status === "live";
  const isResolved = status === "resolved";

  // Pull the whole transcript and replace local state, so the console always
  // matches the database (including the customer's replies).
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/escalations/${escalationId}/thread`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        status: string;
        agentName: string | null;
        messages: ThreadMessage[];
      };
      setMessages(data.messages);
      setStatus(data.status);
      if (data.agentName) setAgentName((prev) => prev || data.agentName!);
    } catch {
      // transient network error — the next tick will retry
    }
  }, [escalationId]);

  // Poll for the customer's replies while the conversation is open.
  useEffect(() => {
    if (isResolved) return;
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [isResolved, refresh]);

  const nameRef = useRef(agentName);
  nameRef.current = agentName;

  async function post(path: string, body: unknown) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/escalations/${escalationId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.text()) || `Request failed (${res.status}).`);
        return false;
      }
      return true;
    } catch {
      setError("Network error — please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!agentName.trim()) {
      setError("Enter your name so the customer knows who they're talking to.");
      return;
    }
    const ok = await post("join", {
      agentName: agentName.trim(),
      intro: intro.trim() || undefined,
    });
    if (ok) {
      setIntro("");
      await refresh();
      router.refresh();
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const ok = await post("message", { agentName: nameRef.current, text });
    if (ok) {
      setDraft("");
      await refresh();
    }
  }

  async function handleSuggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/escalations/${escalationId}/suggest`, {
        method: "POST",
      });
      if (!res.ok) {
        setError(`Couldn't draft a suggestion (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { suggestion?: string };
      if (data.suggestion) setClosingNote(data.suggestion);
    } catch {
      setError("Network error while drafting — please try again.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!closingNote.trim()) {
      setError("Write a short recap of what was agreed.");
      return;
    }
    const ok = await post("resolve", {
      agentName: nameRef.current,
      note: closingNote.trim(),
    });
    if (ok) {
      setShowClose(false);
      setClosingNote("");
      await refresh();
      router.refresh();
    }
  }

  const customerLabel = customerName?.trim().split(/\s+/)[0] ?? "Customer";

  return (
    <div className="flex flex-col">
      {/* Transcript */}
      <Conversation className="max-h-[460px] min-h-[240px] rounded-md border border-rule bg-paper">
        <ConversationContent className="gap-4 p-4">
          {messages.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No messages in this conversation yet.
            </p>
          ) : (
            messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex flex-col items-start gap-1">
                    <div className="text-[11px] text-muted-foreground">
                      {customerLabel} · {fmtTime(m.createdAt)}
                    </div>
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-md bg-secondary px-3 py-2 text-[13px] text-ink">
                      {m.content}
                    </div>
                  </div>
                );
              }
              const isAgent = m.role === "agent";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col gap-1 ${
                    isAgent ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-[11px] text-muted-foreground">
                    {isAgent
                      ? `${m.agentName ?? "You"} · ${fmtTime(m.createdAt)}`
                      : `AI assistant · ${fmtTime(m.createdAt)}`}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-md px-3 py-2 text-[13px] ${
                      isAgent
                        ? "bg-ink text-paper"
                        : "border border-rule bg-card text-ink"
                    }`}
                  >
                    {isAgent ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <MessageResponse className="text-[13px] leading-relaxed">
                        {m.content}
                      </MessageResponse>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}

      {/* Controls */}
      {isResolved ? (
        <div className="mt-3 rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-[12px] text-ink">
          ✓ Conversation closed by {agentName || "a specialist"} — recap
          delivered to the customer&apos;s chat.
        </div>
      ) : !isLive ? (
        <form onSubmit={handleJoin} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="agentName" className="text-[12px]">
              Your name
            </Label>
            <Input
              id="agentName"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Jordan Lee, Claims Specialist"
              className="h-9"
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intro" className="text-[12px]">
              Opening message{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={2}
              disabled={busy}
              placeholder="Leave blank to send a standard introduction."
              className="text-[13px]"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-md">
            <Headset className="size-4" />
            {busy ? "Joining…" : "Join chat"}
          </Button>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Joining takes the AI out of the loop — from then on the customer is
            talking to you.
          </p>
        </form>
      ) : showClose ? (
        <form onSubmit={handleResolve} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="closingNote" className="text-[12px]">
                Recap &amp; next steps
              </Label>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={busy || suggesting}
                className="inline-flex items-center gap-1 rounded-md border border-rule bg-background px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Sparkles size={12} />
                {suggesting ? "Drafting…" : "AI suggest"}
              </button>
            </div>
            <Textarea
              id="closingNote"
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              rows={5}
              disabled={busy || suggesting}
              placeholder="Summarise what you agreed and the next steps. This is sent as your closing message and confirms the recap was emailed."
              className="text-[13px]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-md"
              disabled={busy}
              onClick={() => setShowClose(false)}
            >
              Back
            </Button>
            <Button type="submit" disabled={busy} className="flex-1 rounded-md">
              {busy ? "Sending…" : "Send & close"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <form onSubmit={handleSend} className="relative mt-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={3}
              disabled={busy}
              placeholder={`Message ${customerLabel}…`}
              className="min-h-[84px] pr-14 text-[13px]"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={busy || !draft.trim()}
              aria-label="Send"
              className="absolute right-2 bottom-2"
            >
              <ArrowUp className="size-4" />
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full rounded-md"
            disabled={busy}
            onClick={() => setShowClose(true)}
          >
            Close chat &amp; send recap
          </Button>
        </>
      )}
    </div>
  );
}
