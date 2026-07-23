export const dynamic = "force-dynamic";

import { getAllCustomersWithSummary } from "@/lib/db/pas";
import { PasCustomersTable } from "@/components/pas-customers-dialog";

export default async function PasPage() {
  const customers = await getAllCustomersWithSummary();
  // Dates cross the server → client boundary as strings.
  const rows = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="px-8 py-7">
      <div className="flex items-baseline justify-between border-b border-rule pb-4">
        <div>
          <div className="label-eyebrow">System of record</div>
          <h1 className="mt-0.5 font-display text-3xl">Customers</h1>
        </div>
        <div className="text-[13px] text-muted-foreground">
          <span className="font-medium text-ink">{rows.length}</span> customer
          {rows.length !== 1 && "s"}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No customers found.</p>
      ) : (
        <>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Select a policyholder to review and edit their policies, vehicles,
            claims, coverages, and case documents.
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-rule bg-card">
            <PasCustomersTable customers={rows} />
          </div>
        </>
      )}
    </div>
  );
}
