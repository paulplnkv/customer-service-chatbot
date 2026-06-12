"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PolicyFormDialog } from "@/components/pas/policy-form-dialog";
import { AircraftFormDialog } from "@/components/pas/aircraft-form-dialog";
import { ClaimFormDialog } from "@/components/pas/claim-form-dialog";
import { CoverageFormDialog } from "@/components/pas/coverage-form-dialog";
import { DeleteConfirmDialog } from "@/components/pas/delete-confirm-dialog";
import {
  deletePolicyAction,
  deleteAircraftAction,
  deleteClaimAction,
  deleteCoverageAction,
} from "@/app/(internal)/pas/actions";

type Coverage = {
  id: string;
  type: string;
  limitAmount: string;
  premium: string;
};

type Aircraft = {
  id: string;
  registration: string;
  serialNumber: string;
  year: number;
  make: string;
  model: string;
  hullValue: string | null;
  seats: number | null;
  primaryUse: string | null;
};

type Claim = {
  id: string;
  claimNumber: string;
  status: string;
  type: string;
  description: string | null;
  amount: string | null;
  dateOfIncident: string;
  dateFiled: string;
  dateResolved: string | null;
};

type Policy = {
  id: string;
  policyNumber: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  premium: string;
  deductible: string;
  aircraft: Aircraft[];
  claims: Claim[];
  coverages: Coverage[];
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  policies: Policy[];
};

type DeleteTarget =
  | { kind: "policy"; id: string; label: string; childCounts: { aircraft: number; claims: number; coverages: number } }
  | { kind: "aircraft"; id: string; label: string }
  | { kind: "claim"; id: string; label: string }
  | { kind: "coverage"; id: string; label: string };

type FormTarget =
  | { kind: "policy"; customerId: string; data?: Policy }
  | { kind: "aircraft"; policyId: string; data?: Aircraft }
  | { kind: "claim"; policyId: string; data?: Claim }
  | { kind: "coverage"; policyId: string; data?: Coverage };

export function PasCustomersTable({ customers }: { customers: Customer[] }) {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  // Sync selected customer with latest props after mutations
  useEffect(() => {
    if (selected) {
      const fresh = customers.find((c) => c.id === selected.id);
      if (fresh) {
        setSelected(fresh);
      } else {
        setSelected(null);
      }
    }
  }, [customers]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDelete() {
    if (!deleteTarget) return Promise.resolve({ success: false, error: "No target" });
    switch (deleteTarget.kind) {
      case "policy":
        return deletePolicyAction(deleteTarget.id);
      case "aircraft":
        return deleteAircraftAction(deleteTarget.id);
      case "claim":
        return deleteClaimAction(deleteTarget.id);
      case "coverage":
        return deleteCoverageAction(deleteTarget.id);
    }
  }

  function deleteDescription() {
    if (!deleteTarget) return "";
    if (deleteTarget.kind === "policy") {
      const { aircraft, claims, coverages } = deleteTarget.childCounts;
      const parts: string[] = [];
      if (aircraft > 0) parts.push(`${aircraft} aircraft`);
      if (claims > 0) parts.push(`${claims} claim${claims !== 1 ? "s" : ""}`);
      if (coverages > 0) parts.push(`${coverages} coverage${coverages !== 1 ? "s" : ""}`);
      const cascade = parts.length > 0 ? ` This will also delete ${parts.join(", ")}.` : "";
      return `Are you sure you want to delete policy ${deleteTarget.label}?${cascade}`;
    }
    return `Are you sure you want to delete ${deleteTarget.kind} "${deleteTarget.label}"?`;
  }

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%]">Customer</TableHead>
            <TableHead className="w-[12%]">Phone</TableHead>
            <TableHead className="w-[16%]">Policies</TableHead>
            <TableHead className="w-[10%]">Aircraft</TableHead>
            <TableHead className="w-[16%]">Claims</TableHead>
            <TableHead className="w-[14%] text-right">Premium</TableHead>
            <TableHead className="w-[12%] text-right">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => {
            const activePolicies = c.policies.filter(
              (p) => p.status === "active"
            ).length;
            const totalAircraft = c.policies.reduce(
              (sum, p) => sum + p.aircraft.length,
              0
            );
            const totalClaims = c.policies.reduce(
              (sum, p) => sum + p.claims.length,
              0
            );
            const openClaims = c.policies.reduce(
              (sum, p) =>
                sum +
                p.claims.filter(
                  (cl) => cl.status === "open" || cl.status === "in_review"
                ).length,
              0
            );
            const totalPremium = c.policies.reduce(
              (sum, p) => sum + parseFloat(p.premium),
              0
            );

            return (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <TableCell>
                  <div className="font-medium">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.email}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.phone ?? "\u2014"}
                </TableCell>
                <TableCell>
                  <span>{c.policies.length}</span>
                  {activePolicies > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activePolicies} active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {totalAircraft}
                </TableCell>
                <TableCell>
                  <span>{totalClaims}</span>
                  {openClaims > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {openClaims} open
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  $
                  {totalPremium.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Customer Detail Dialog */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selected.firstName} {selected.lastName}
              </DialogTitle>
              <DialogDescription>
                {selected.email}
                {selected.phone && ` \u00B7 ${selected.phone}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Policies</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFormTarget({ kind: "policy", customerId: selected.id })
                }
              >
                + Add Policy
              </Button>
            </div>

            {selected.policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No policies.</p>
            ) : (
              <div className="space-y-6">
                {selected.policies.map((policy) => (
                  <div key={policy.id} className="space-y-3">
                    {/* Policy header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {policy.policyNumber}
                        </span>
                        <Badge
                          variant={
                            policy.status === "active" ? "secondary" : "outline"
                          }
                        >
                          {policy.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {policy.type}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setFormTarget({
                              kind: "policy",
                              customerId: selected.id,
                              data: policy,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "policy",
                              id: policy.id,
                              label: policy.policyNumber,
                              childCounts: {
                                aircraft: policy.aircraft.length,
                                claims: policy.claims.length,
                                coverages: policy.coverages.length,
                              },
                            })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Policy details */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Period
                        </div>
                        <div>
                          {policy.startDate} — {policy.endDate}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Premium
                        </div>
                        <div>
                          $
                          {parseFloat(policy.premium).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Deductible
                        </div>
                        <div>
                          $
                          {parseFloat(policy.deductible).toLocaleString(
                            "en-US",
                            { minimumFractionDigits: 2 }
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Aircraft section */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Aircraft
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() =>
                            setFormTarget({
                              kind: "aircraft",
                              policyId: policy.id,
                            })
                          }
                        >
                          + Add
                        </Button>
                      </div>
                      {policy.aircraft.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No aircraft.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Aircraft</TableHead>
                              <TableHead>Registration</TableHead>
                              <TableHead>Serial #</TableHead>
                              <TableHead className="text-right">
                                Hull Value
                              </TableHead>
                              <TableHead className="w-[100px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {policy.aircraft.map((a) => (
                              <TableRow key={a.id}>
                                <TableCell>
                                  {a.year} {a.make} {a.model}
                                  {a.primaryUse && (
                                    <span className="ml-1 text-muted-foreground">
                                      ({a.primaryUse})
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {a.registration}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {a.serialNumber}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {a.hullValue
                                    ? `$${parseFloat(a.hullValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                    : "\u2014"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() =>
                                      setFormTarget({
                                        kind: "aircraft",
                                        policyId: policy.id,
                                        data: a,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: "aircraft",
                                        id: a.id,
                                        label: `${a.year} ${a.make} ${a.model}`,
                                      })
                                    }
                                  >
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {/* Claims section */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Claims
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() =>
                            setFormTarget({
                              kind: "claim",
                              policyId: policy.id,
                            })
                          }
                        >
                          + Add
                        </Button>
                      </div>
                      {policy.claims.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No claims.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Claim #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                              <TableHead className="text-right">
                                Incident
                              </TableHead>
                              <TableHead className="w-[100px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {policy.claims.map((cl) => (
                              <TableRow key={cl.id}>
                                <TableCell className="font-mono text-xs">
                                  {cl.claimNumber}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {cl.type}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      cl.status === "open" ||
                                      cl.status === "in_review"
                                        ? "destructive"
                                        : cl.status === "approved"
                                          ? "secondary"
                                          : "outline"
                                    }
                                  >
                                    {cl.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {cl.amount
                                    ? `$${parseFloat(cl.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                    : "\u2014"}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {cl.dateOfIncident}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() =>
                                      setFormTarget({
                                        kind: "claim",
                                        policyId: policy.id,
                                        data: cl,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: "claim",
                                        id: cl.id,
                                        label: cl.claimNumber,
                                      })
                                    }
                                  >
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {/* Coverages section */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Coverages
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() =>
                            setFormTarget({
                              kind: "coverage",
                              policyId: policy.id,
                            })
                          }
                        >
                          + Add
                        </Button>
                      </div>
                      {policy.coverages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No coverages.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">
                                Limit
                              </TableHead>
                              <TableHead className="text-right">
                                Premium
                              </TableHead>
                              <TableHead className="w-[100px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {policy.coverages.map((cv) => (
                              <TableRow key={cv.id}>
                                <TableCell>
                                  {cv.type.replace(/_/g, " ")}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  $
                                  {parseFloat(cv.limitAmount).toLocaleString(
                                    "en-US",
                                    { minimumFractionDigits: 2 }
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  $
                                  {parseFloat(cv.premium).toLocaleString(
                                    "en-US",
                                    { minimumFractionDigits: 2 }
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() =>
                                      setFormTarget({
                                        kind: "coverage",
                                        policyId: policy.id,
                                        data: cv,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({
                                        kind: "coverage",
                                        id: cv.id,
                                        label: cv.type.replace(/_/g, " "),
                                      })
                                    }
                                  >
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {selected.policies.indexOf(policy) <
                      selected.policies.length - 1 && (
                      <hr className="border-border" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.kind ?? ""}`}
        description={deleteDescription()}
        onConfirm={handleDelete}
      />

      {/* Form Dialogs */}
      {formTarget?.kind === "policy" && (
        <PolicyFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setFormTarget(null);
          }}
          customerId={formTarget.customerId}
          initial={formTarget.data ?? null}
        />
      )}
      {formTarget?.kind === "aircraft" && (
        <AircraftFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setFormTarget(null);
          }}
          policyId={formTarget.policyId}
          initial={formTarget.data ?? null}
        />
      )}
      {formTarget?.kind === "claim" && (
        <ClaimFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setFormTarget(null);
          }}
          policyId={formTarget.policyId}
          initial={formTarget.data ?? null}
        />
      )}
      {formTarget?.kind === "coverage" && (
        <CoverageFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setFormTarget(null);
          }}
          policyId={formTarget.policyId}
          initial={formTarget.data ?? null}
        />
      )}
    </>
  );
}
