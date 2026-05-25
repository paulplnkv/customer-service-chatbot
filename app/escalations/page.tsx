import { getAllEscalations } from "@/lib/db/escalations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function EscalationsPage() {
  const escalations = await getAllEscalations();

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Escalation Requests
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {escalations.length} request{escalations.length !== 1 && "s"}
      </p>

      {escalations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No escalation requests yet.
        </p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Customer</TableHead>
              <TableHead className="w-[25%]">Reason</TableHead>
              <TableHead className="w-[35%]">Summary</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[10%] text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {escalations.map((esc) => (
              <TableRow key={esc.id}>
                <TableCell>
                  <div className="font-medium">
                    {esc.customerName ?? "Anonymous"}
                  </div>
                  {esc.customerEmail && (
                    <div className="truncate text-xs text-muted-foreground">
                      {esc.customerEmail}
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {esc.reason}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {esc.chatSummary}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={esc.status === "pending" ? "outline" : "secondary"}
                  >
                    {esc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {esc.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
