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
  createAircraftAction,
  updateAircraftAction,
} from "@/app/(internal)/pas/actions";

type AircraftData = {
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

export function AircraftFormDialog({
  open,
  onOpenChange,
  policyId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  initial?: AircraftData | null;
}) {
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = isEdit
      ? await updateAircraftAction(initial.id, formData)
      : await createAircraftAction(policyId, formData);

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
          <DialogTitle>{isEdit ? "Edit Aircraft" : "Add Aircraft"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the aircraft details below."
              : "Fill in the details to add an aircraft to this policy."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="registration">Registration (N-Number)</Label>
              <Input
                id="registration"
                name="registration"
                defaultValue={initial?.registration ?? ""}
                required
                maxLength={12}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                defaultValue={initial?.serialNumber ?? ""}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                name="year"
                type="number"
                defaultValue={initial?.year ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                name="make"
                defaultValue={initial?.make ?? ""}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                name="model"
                defaultValue={initial?.model ?? ""}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hullValue">Hull Value</Label>
              <Input
                id="hullValue"
                name="hullValue"
                type="number"
                step="0.01"
                defaultValue={initial?.hullValue ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seats">Seats</Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                defaultValue={initial?.seats ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primaryUse">Primary Use</Label>
              <Input
                id="primaryUse"
                name="primaryUse"
                defaultValue={initial?.primaryUse ?? ""}
                maxLength={100}
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
