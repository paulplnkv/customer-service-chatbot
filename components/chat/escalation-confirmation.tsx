"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EscalationConfirmationProps = {
  reason: string;
  state: string;
  output?: string;
  isAnonymous: boolean;
  onConfirm: (email?: string) => void;
  onDismiss: () => void;
};

export function EscalationConfirmation({
  reason,
  state,
  output,
  isAnonymous,
  onConfirm,
  onDismiss,
}: EscalationConfirmationProps) {
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolved = state === "output-available";

  function accept() {
    if (isAnonymous) {
      setNeedEmail(true);
    } else {
      setLoading(true);
      onConfirm();
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setLoading(true);
    onConfirm(v);
  }

  return (
    <div className="mt-3 rounded-md border border-ink/30 bg-card p-3.5">
      <div className="label-eyebrow text-ink">Escalate to human agent</div>
      <div className="mt-1 text-[13px]">
        <span className="font-medium">Reason:</span> {reason}
      </div>

      {resolved ? (
        <div className="mt-2 text-[12px] text-muted-foreground">
          {output === "confirmed" ? "Handoff initiated." : "Continued with AI."}
        </div>
      ) : needEmail ? (
        <form onSubmit={submitEmail} className="mt-3 space-y-2">
          <div className="text-[12.5px] text-muted-foreground">
            Enter your email so an agent can reach you:
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              autoFocus
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(false);
              }}
              className="h-9"
            />
            <Button
              size="sm"
              type="submit"
              disabled={loading}
              className="h-9 rounded-md px-3 text-xs"
            >
              {loading ? "Sending…" : "Send"}
            </Button>
          </div>
          {emailError && (
            <div className="text-[12px] text-destructive">
              Please enter a valid email.
            </div>
          )}
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={accept}
            disabled={loading}
            className="h-8 rounded-md px-3 text-xs"
          >
            {loading ? "Connecting…" : "Yes, connect me"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            disabled={loading}
            className="h-8 rounded-md px-3 text-xs"
          >
            No, continue chatting
          </Button>
        </div>
      )}
    </div>
  );
}
