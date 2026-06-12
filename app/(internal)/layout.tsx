export const dynamic = "force-dynamic";

import { getAllEscalations } from "@/lib/db/escalations";
import { InternalSidebar } from "@/components/internal/internal-sidebar";

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const escalations = await getAllEscalations();
  const pending = escalations.filter((e) => e.status === "pending").length;

  return (
    <div className="flex min-h-screen">
      <InternalSidebar pending={pending} />
      <main className="min-w-0 flex-1 bg-background">{children}</main>
    </div>
  );
}
