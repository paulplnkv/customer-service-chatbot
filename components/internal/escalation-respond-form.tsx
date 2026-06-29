"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EscalationRespondForm({
  escalationId,
}: {
  escalationId: string;
}) {
  const router = useRouter();
  const [agentName, setAgentName] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (data.suggestion) setResponse(data.suggestion);
    } catch {
      setError("Network error while drafting — please try again.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim()) {
      setError("Please write a suggestion for the customer.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escalations/${escalationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: agentName.trim(), agentResponse: response }),
      });
      if (!res.ok) {
        setError(`Failed to send (${res.status}).`);
        setLoading(false);
        return;
      }
      // The recap is now in the customer's conversation and the escalation is
      // resolved — refresh to show the resolved state.
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
          disabled={loading}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="response" className="text-[12px]">
            Suggestion for the customer
          </Label>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={loading || suggesting}
            className="inline-flex items-center gap-1 rounded-md border border-rule bg-background px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Sparkles size={12} />
            {suggesting ? "Drafting…" : "AI suggest"}
          </button>
        </div>
        <textarea
          id="response"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={6}
          disabled={loading || suggesting}
          placeholder="Explain how to proceed and the next steps. The assistant will turn this into a recap and deliver it to the customer in their chat. Or tap “AI suggest” for a grounded draft."
          className="w-full resize-none rounded-md border border-rule bg-paper px-3 py-2.5 text-[13px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || suggesting} className="w-full rounded-md">
        {loading ? "Sending…" : "Send recap to customer"}
      </Button>
    </form>
  );
}
