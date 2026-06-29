export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAllCustomersWithSummary } from "@/lib/db/pas";
import { toPolicyView } from "@/lib/pas/policy-view";

export default async function PasPage() {
  const customers = await getAllCustomersWithSummary();
  const rows = customers.map(toPolicyView);

  return (
    <div className="px-8 py-7">
      <div className="flex items-baseline justify-between border-b border-rule pb-4">
        <div>
          <div className="label-eyebrow">System of record</div>
          <h1 className="mt-0.5 font-display text-3xl">Customers</h1>
        </div>
        <div className="text-[13px] text-muted-foreground">
          <span className="font-medium text-ink">{rows.length}</span>{" "}
          customer{rows.length !== 1 && "s"}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No customers found.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-rule bg-card">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr className="label-eyebrow text-left">
                <th className="p-3">Policyholder</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Policies</th>
                <th className="p-3">Insured objects</th>
                <th className="p-3">Limits</th>
                <th className="p-3">Claims</th>
                <th className="p-3 text-right">Premium</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-rule align-top transition-colors hover:bg-secondary/60"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/pas/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${
                          c.kind === "Corporate"
                            ? "border-ink bg-ink text-paper"
                            : "border-rule bg-paper text-ink"
                        }`}
                      >
                        {c.kind}
                      </span>
                    </div>
                    {c.policyNumber && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.policyNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-[12px]">
                    <div className="text-ink">{c.email}</div>
                    <div className="text-muted-foreground">{c.phone ?? "—"}</div>
                  </td>
                  <td className="p-3 text-[12px]">
                    <Link
                      href={`/pas/${c.id}`}
                      className="text-ink hover:underline"
                    >
                      {c.policyType}
                    </Link>
                    <div className="mt-0.5 text-muted-foreground">
                      {c.policyCount} total
                      {c.activeCount > 0 && (
                        <span className="ml-1.5 rounded-sm bg-ink px-1.5 py-0.5 text-[10px] text-paper">
                          {c.activeCount} active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-[12px]">
                    {c.insuredObjects.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {c.insuredObjects.map((o, i) => (
                          <li key={i} className="text-ink">
                            {o}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-[12px] tabular-nums">
                    {c.limit}
                  </td>
                  <td className="whitespace-nowrap p-3 text-[12px]">
                    {c.claims}
                    {c.openClaims > 0 && (
                      <span className="ml-1.5 whitespace-nowrap rounded-sm border border-gold/40 bg-gold/20 px-1.5 py-0.5 text-[10px] text-ink">
                        {c.openClaims} open
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    ${c.premium.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap p-3 text-[12px] text-muted-foreground">
                    {new Date(c.joined).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
