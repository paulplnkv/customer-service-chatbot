"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createClaimAction,
  updateClaimAction,
} from "@/app/pas/actions";

const CLAIM_TYPES = ["collision", "comprehensive", "liability", "hail", "theft"];
const CLAIM_STATUSES = ["open", "in_review", "approved", "closed", "denied"];

type ClaimData = {
  id: string;
  claimNumber: string;
  type: string;
  status: string;
  description: string | null;
  amount: string | null;
  dateOfIncident: string;
  dateFiled: string;
  dateResolved: string | null;
};

export function ClaimFormDialog({
  open,
  onOpenChange,
  policyId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  initial?: ClaimData | null;
}) {
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(initial?.type ?? CLAIM_TYPES[0]);
  const [status, setStatus] = useState(initial?.status ?? CLAIM_STATUSES[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("status", status);

    const result = isEdit
      ? await updateClaimAction(initial.id, formData)
      : await createClaimAction(policyId, formData);

    setLoading(false);
    if (result.success) {
      onOpenChange(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          setError(null);
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Claim" : "Add Claim"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the claim details below."
              : "Fill in the details to file a new claim."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="claimNumber">Claim Number</Label>
              <Input
                id="claimNumber"
                name="claimNumber"
                defaultValue={initial?.claimNumber ?? ""}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial?.amount ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfIncident">Date of Incident</Label>
              <Input
                id="dateOfIncident"
                name="dateOfIncident"
                type="date"
                defaultValue={initial?.dateOfIncident ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateFiled">Date Filed</Label>
              <Input
                id="dateFiled"
                name="dateFiled"
                type="date"
                defaultValue={initial?.dateFiled ?? ""}
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="dateResolved">Date Resolved</Label>
              <Input
                id="dateResolved"
                name="dateResolved"
                type="date"
                defaultValue={initial?.dateResolved ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={initial?.description ?? ""}
                rows={3}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
