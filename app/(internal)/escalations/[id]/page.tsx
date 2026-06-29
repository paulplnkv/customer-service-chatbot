export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Car } from "lucide-react";
import { getEscalationById } from "@/lib/db/escalations";
import { getCustomerByUserId, getFullCustomerData } from "@/lib/db/pas";
import { policyTypeLabel } from "@/lib/pas/policy-view";
import { EscalationRespondForm } from "@/components/internal/escalation-respond-form";

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function money(v: string | null) {
  if (v == null) return "—";
  return `$${Number(v).toLocaleString("en-US")}`;
}

function statusChip(status: string) {
  const map: Record<string, string> = {
    approved: "border-transparent bg-emerald-600 text-white",
    in_review: "border-transparent bg-amber-500 text-white",
    open: "border-transparent bg-amber-500 text-white",
    denied: "border-transparent bg-red-600 text-white",
  };
  return map[status] ?? "border-rule bg-secondary text-ink";
}

function claimDetail(c: {
  status: string;
  paymentStatus: string | null;
  paymentDate: string | null;
  dateFiled: string;
  description: string | null;
}): string {
  if (c.status === "approved")
    return c.paymentStatus === "paid"
      ? `Paid ${fmtDate(c.paymentDate)}`
      : `Payout ${c.paymentStatus ?? "pending"} ${fmtDate(c.paymentDate)}`;
  if (c.status === "in_review") return `In review since ${fmtDate(c.dateFiled)}`;
  if (c.status === "denied") return c.description ?? "Denied";
  return c.description ?? "";
}

export default async function EscalationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const escalation = await getEscalationById(id);
  if (!escalation) notFound();

  const customer = escalation.userId
    ? await getCustomerByUserId(escalation.userId)
    : null;
  const fullData = escalation.userId
    ? await getFullCustomerData(escalation.userId)
    : null;

  const isResolved = escalation.status === "resolved";

  return (
    <div className="max-w-[1100px] px-8 py-7">
      <Link
        href="/escalations"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Escalations
      </Link>

      <div className="mt-3 flex items-baseline justify-between border-b border-rule pb-4">
        <div>
          <div className="label-eyebrow">Escalation</div>
          <h1 className="mt-0.5 font-display text-3xl">
            {escalation.customerName ?? "Anonymous customer"}
          </h1>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {escalation.customerEmail ?? "No email on file"} · opened{" "}
            {fmtDate(escalation.createdAt)}
          </div>
        </div>
        <span
          className={`rounded-sm border px-2 py-0.5 text-[11px] ${
            isResolved
              ? "border-emerald-600/40 bg-emerald-600/15 text-ink"
              : "border-amber-500/40 bg-amber-500/15 text-ink"
          }`}
        >
          {isResolved ? "Resolved" : "Pending"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Customer record */}
        <section className="space-y-5">
          <div className="rounded-md border border-rule bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">Customer record</div>
              {customer && (
                <Link
                  href={`/pas/${customer.id}`}
                  className="text-[12px] text-ink underline underline-offset-2 hover:no-underline"
                >
                  Open full record →
                </Link>
              )}
            </div>

            {!fullData ? (
              <p className="mt-2 text-[13px] text-muted-foreground">
                Anonymous chat — no linked account to review.
              </p>
            ) : (
              <>
                <div className="mt-2 text-[13px]">
                  <div className="font-medium">
                    {fullData.customer.firstName} {fullData.customer.lastName}
                  </div>
                  <div className="text-muted-foreground">
                    {fullData.customer.email}
                  </div>
                  <div className="text-muted-foreground">
                    {fullData.customer.phone ?? "—"}
                  </div>
                </div>

                {fullData.policies.map((p) => (
                  <div key={p.policyNumber} className="mt-4 border-t border-rule pt-4">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-mono">{p.policyNumber}</span>
                      <span className="text-muted-foreground">
                        {policyTypeLabel(p.type)}
                      </span>
                      <span className="rounded-sm border border-rule bg-secondary px-1.5 py-0.5 text-[10px] capitalize">
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Effective {fmtDate(p.startDate)} · renews {fmtDate(p.endDate)} ·
                      deductible {money(p.deductible)}
                    </div>

                    {p.vehicles.map((v) => (
                      <div
                        key={v.vin}
                        className="mt-2 flex items-center gap-2 text-[12.5px] text-ink"
                      >
                        <Car size={14} className="text-muted-foreground" />
                        {v.year} {v.make} {v.model} · {v.plate}
                      </div>
                    ))}

                    {p.claims.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {p.claims.map((c) => (
                          <li
                            key={c.claimNumber}
                            className="rounded-md border border-rule bg-paper p-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {c.claimNumber}
                              </span>
                              <span
                                className={`rounded-sm border px-1.5 py-0.5 text-[10px] capitalize ${statusChip(
                                  c.status
                                )}`}
                              >
                                {c.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[12.5px]">
                              <span className="capitalize">
                                {c.type.replace(/-/g, " ")}
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {money(c.amount)}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                              {claimDetail(c)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Conversation + reply */}
        <section className="space-y-5">
          <div className="rounded-md border border-rule bg-card p-5">
            <div className="label-eyebrow">Why it was escalated</div>
            <div className="mt-2 text-[13px] font-medium">{escalation.reason}</div>
            {escalation.chatSummary && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {escalation.chatSummary}
              </p>
            )}
          </div>

          <div className="rounded-md border border-rule bg-card p-5">
            <div className="label-eyebrow">
              {isResolved ? "Your reply" : "Respond to the customer"}
            </div>
            {isResolved ? (
              <div className="mt-2 space-y-2">
                <div className="text-[12px] text-muted-foreground">
                  Sent by {escalation.agentName ?? "a specialist"} ·{" "}
                  {fmtDate(escalation.resolvedAt)}
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                  {escalation.agentResponse}
                </p>
                <div className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-[12px] text-ink">
                  ✓ Recap delivered to the customer&apos;s chat.
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <EscalationRespondForm escalationId={escalation.id} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
