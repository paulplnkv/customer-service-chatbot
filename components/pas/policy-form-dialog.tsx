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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPolicyAction,
  updatePolicyAction,
} from "@/app/(internal)/pas/actions";

const POLICY_TYPES = ["auto", "home", "life", "health"];
const POLICY_STATUSES = ["active", "expired", "pending", "cancelled"];

type PolicyData = {
  id: string;
  policyNumber: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  premium: string;
  deductible: string;
};

export function PolicyFormDialog({
  open,
  onOpenChange,
  customerId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  initial?: PolicyData | null;
}) {
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(initial?.type ?? POLICY_TYPES[0]);
  const [status, setStatus] = useState(initial?.status ?? POLICY_STATUSES[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("status", status);

    const result = isEdit
      ? await updatePolicyAction(initial.id, formData)
      : await createPolicyAction(customerId, formData);

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
          <DialogTitle>{isEdit ? "Edit Policy" : "Add Policy"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the policy details below."
              : "Fill in the details to create a new policy."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="policyNumber">Policy Number</Label>
              <Input
                id="policyNumber"
                name="policyNumber"
                defaultValue={initial?.policyNumber ?? ""}
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
                  {POLICY_TYPES.map((t) => (
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
                  {POLICY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={initial?.startDate ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={initial?.endDate ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="premium">Premium ($)</Label>
              <Input
                id="premium"
                name="premium"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial?.premium ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deductible">Deductible ($)</Label>
              <Input
                id="deductible"
                name="deductible"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial?.deductible ?? ""}
                required
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
