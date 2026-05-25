"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneForwarded, X } from "lucide-react";

type EscalationConfirmationProps = {
  reason: string;
  state: string;
  output?: string;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function EscalationConfirmation({
  reason,
  state,
  output,
  onConfirm,
  onDismiss,
}: EscalationConfirmationProps) {
  const [loading, setLoading] = useState(false);

  if (state === "output-available") {
    const confirmed = output === "confirmed";
    return (
      <div className="flex items-start gap-3 rounded-xl border bg-muted/50 p-4">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            confirmed ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
          }`}
        >
          {confirmed ? (
            <PhoneForwarded className="size-4" />
          ) : (
            <X className="size-4" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {confirmed
              ? "Escalation submitted"
              : "Escalation cancelled"}
          </p>
          <p className="text-xs text-muted-foreground">
            {confirmed
              ? "A human agent will follow up with you shortly."
              : "No problem — I'll keep helping you here."}
          </p>
        </div>
      </div>
    );
  }

  // input-available state: show confirmation buttons
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PhoneForwarded className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Would you like to speak with a human agent?
          </p>
          <p className="text-xs text-muted-foreground">{reason}</p>
        </div>
      </div>
      <div className="flex gap-2 pl-12">
        <Button
          size="sm"
          onClick={() => {
            setLoading(true);
            onConfirm();
          }}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Yes, connect me"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDismiss}
          disabled={loading}
        >
          No, continue chatting
        </Button>
      </div>
    </div>
  );
}
