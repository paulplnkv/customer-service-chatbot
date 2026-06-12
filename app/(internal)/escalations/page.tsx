export const dynamic = "force-dynamic";

import { getAllEscalations } from "@/lib/db/escalations";

const contactLinkClass =
  "inline-flex h-7 items-center rounded-md border border-rule bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted";

export default async function EscalationsPage() {
  const escalations = await getAllEscalations();

  return (
    <div className="px-8 py-7">
      <div className="flex items-baseline justify-between border-b border-rule pb-4">
        <div>
          <div className="label-eyebrow">Queue</div>
          <h1 className="mt-0.5 font-display text-3xl">Escalations</h1>
        </div>
        <div className="text-[13px] text-muted-foreground">
          <span className="font-medium text-ink">{escalations.length}</span> total
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-rule bg-card">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr className="label-eyebrow text-left">
              <th className="w-[200px]">Customer</th>
              <th className="w-[20%]">Reason</th>
              <th>Summary</th>
              <th className="w-[120px]">Date</th>
              <th className="w-[180px]">Contact</th>
            </tr>
          </thead>
          <tbody>
            {escalations.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No escalations yet.
                </td>
              </tr>
            )}
            {escalations.map((esc) => (
              <tr
                key={esc.id}
                className="border-t border-rule align-top hover:bg-secondary/40"
              >
                <td className="align-top">
                  <div className="font-medium">
                    {esc.customerName ?? (
                      <span className="italic text-muted-foreground">
                        Anonymous
                      </span>
                    )}
                  </div>
                  {esc.customerEmail && (
                    <div className="text-[11px] text-muted-foreground">
                      {esc.customerEmail}
                    </div>
                  )}
                </td>
                <td className="align-top">{esc.reason}</td>
                <td className="align-top text-[12px] leading-relaxed text-muted-foreground">
                  {esc.chatSummary}
                </td>
                <td className="whitespace-nowrap align-top text-muted-foreground">
                  {esc.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="align-top">
                  {esc.customerEmail ? (
                    <div className="flex flex-wrap gap-2">
                      <a
                        className={contactLinkClass}
                        href={`mailto:${esc.customerEmail}?subject=${encodeURIComponent(
                          `STARR Aviation — ${esc.reason}`
                        )}`}
                      >
                        Email
                      </a>
                    </div>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
