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
} from "@/app/pas/actions";

type VehicleData = {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string | null;
  color: string | null;
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
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                name="licensePlate"
                defaultValue={initial?.licensePlate ?? ""}
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                name="color"
                defaultValue={initial?.color ?? ""}
                maxLength={50}
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
