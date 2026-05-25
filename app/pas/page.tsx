import { getAllCustomersWithSummary } from "@/lib/db/pas";
import { PasCustomersTable } from "@/components/pas-customers-dialog";

export default async function PasPage() {
  const customers = await getAllCustomersWithSummary();

  const serialized = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        PaS Customers
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {customers.length} customer{customers.length !== 1 && "s"}
      </p>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customers found.</p>
      ) : (
        <PasCustomersTable customers={serialized} />
      )}
    </div>
  );
}
