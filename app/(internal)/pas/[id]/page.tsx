export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllCustomersWithSummary } from "@/lib/db/pas";
import { toPolicyView } from "@/lib/pas/policy-view";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customers = await getAllCustomersWithSummary();
  const customer = customers.find((c) => c.id === id);
  if (!customer) notFound();

  const p = toPolicyView(customer);

  return (
    <div className="max-w-[1200px] px-8 py-7">
      <Link
        href="/pas"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Policies
      </Link>

      <div className="mt-3 flex items-baseline justify-between border-b border-rule pb-4">
        <div>
          <div className="label-eyebrow">
            Policy file · {p.policyNumber ?? p.id.slice(0, 8).toUpperCase()}
          </div>
          <h1 className="mt-0.5 font-display text-3xl">{p.name}</h1>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span
              className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${
                p.kind === "Corporate"
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-paper text-ink"
              }`}
            >
              {p.kind}
            </span>
            <span>{p.policyType}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="label-eyebrow">Annual premium</div>
          <div className="font-display text-2xl tabular-nums">
            ${p.premium.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-5">
        <Card label="Limit of liability" value={p.limit} />
        <Card
          label="Policies on file"
          value={`${p.policyCount} total · ${p.activeCount} active`}
        />
        <Card
          label="Claims"
          value={
            <span>
              {p.claims}
              {p.openClaims > 0 && (
                <span className="ml-1.5 rounded-sm border border-gold/40 bg-gold/20 px-1.5 py-0.5 text-[10px] text-ink">
                  {p.openClaims} open
                </span>
              )}
            </span>
          }
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <section className="rounded-md border border-rule bg-card p-5">
          <div className="label-eyebrow">Policyholder contact</div>
          <div className="mt-2 text-[13px]">
            <div className="font-medium">{p.name}</div>
            <div className="text-muted-foreground">{p.email}</div>
            <div className="text-muted-foreground">{p.phone ?? "—"}</div>
          </div>
        </section>
        <section className="rounded-md border border-rule bg-card p-5">
          <div className="label-eyebrow">Coverage term</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
            <div>
              <div className="text-[11px] text-muted-foreground">Effective</div>
              <div className="tabular-nums">{fmtDate(p.effective)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Renewal</div>
              <div className="tabular-nums">{fmtDate(p.renewal)}</div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-md border border-rule bg-card p-5">
        <div className="label-eyebrow">Insured objects</div>
        {p.insuredObjects.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            No scheduled aircraft on this account.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {p.insuredObjects.map((o, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-2 text-[13px]"
              >
                <span>{o}</span>
                <span className="text-[11px] text-muted-foreground">
                  Scheduled
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-md border border-rule bg-card p-5">
        <div className="label-eyebrow">Underwriting notes</div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {p.kind === "Corporate"
            ? `Operator-level account. Risk profile aligned with ${p.policyType.toLowerCase()} class; loss ratio reviewed at last renewal.`
            : `Owner-flown account. Pilot logbook and currency on file; risk profile standard for the ${p.policyType.toLowerCase()} class.`}
        </p>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-rule bg-card p-4">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1 font-display text-xl">{value}</div>
    </div>
  );
}
