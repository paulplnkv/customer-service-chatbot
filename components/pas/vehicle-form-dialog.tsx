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
  createVehicleAction,
  updateVehicleAction,
} from "@/app/(internal)/pas/actions";

type VehicleData = {
  id: string;
  plate: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  value: string | null;
  seats: number | null;
  use: string | null;
};

export function VehicleFormDialog({
  open,
  onOpenChange,
  policyId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  initial?: VehicleData | null;
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
      ? await updateVehicleAction(initial.id, formData)
      : await createVehicleAction(policyId, formData);

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
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the vehicle details below."
              : "Fill in the details to add a vehicle to this policy."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate">License Plate</Label>
              <Input
                id="plate"
                name="plate"
                defaultValue={initial?.plate ?? ""}
                required
                maxLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                name="vin"
                defaultValue={initial?.vin ?? ""}
                required
                maxLength={17}
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
              <Label htmlFor="value">Vehicle Value</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.01"
                defaultValue={initial?.value ?? ""}
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
              <Label htmlFor="use">Primary Use</Label>
              <Input
                id="use"
                name="use"
                defaultValue={initial?.use ?? ""}
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
