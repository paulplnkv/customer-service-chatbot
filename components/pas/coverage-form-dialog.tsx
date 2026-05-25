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
  createCoverageAction,
  updateCoverageAction,
} from "@/app/pas/actions";

const COVERAGE_TYPES = [
  "liability",
  "collision",
  "comprehensive",
  "uninsured_motorist",
  "medical_payments",
  "rental",
];

type CoverageData = {
  id: string;
  type: string;
  limitAmount: string;
  premium: string;
};

export function CoverageFormDialog({
  open,
  onOpenChange,
  policyId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  initial?: CoverageData | null;
}) {
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(initial?.type ?? COVERAGE_TYPES[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);

    const result = isEdit
      ? await updateCoverageAction(initial.id, formData)
      : await createCoverageAction(policyId, formData);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Coverage" : "Add Coverage"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the coverage details below."
              : "Fill in the details to add coverage to this policy."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="limitAmount">Limit Amount ($)</Label>
                <Input
                  id="limitAmount"
                  name="limitAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={initial?.limitAmount ?? ""}
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
