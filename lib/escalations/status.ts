// Escalation lifecycle:
//   pending  — customer asked for a human, nobody has picked it up yet
//   live     — an agent joined; the AI is silent and the agent chats directly
//   resolved — the agent closed the conversation and sent the recap
export type EscalationStatus = "pending" | "live" | "resolved";

export function escalationStatusLabel(status: string): string {
  if (status === "resolved") return "Resolved";
  if (status === "live") return "Live";
  return "Pending";
}

export function escalationStatusClass(status: string): string {
  if (status === "resolved")
    return "border-emerald-600/40 bg-emerald-600/15 text-ink";
  if (status === "live") return "border-sky-500/40 bg-sky-500/15 text-ink";
  return "border-amber-500/40 bg-amber-500/15 text-ink";
}

// Escalations still needing an agent's attention (queue badge).
export function isOpenEscalation(status: string): boolean {
  return status === "pending" || status === "live";
}
