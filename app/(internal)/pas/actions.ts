"use server";

import { revalidatePath } from "next/cache";
import {
  createPolicy as dbCreatePolicy,
  updatePolicy as dbUpdatePolicy,
  deletePolicy as dbDeletePolicy,
  createVehicle as dbCreateVehicle,
  updateVehicle as dbUpdateVehicle,
  deleteVehicle as dbDeleteVehicle,
  createClaim as dbCreateClaim,
  updateClaim as dbUpdateClaim,
  deleteClaim as dbDeleteClaim,
  createCoverage as dbCreateCoverage,
  updateCoverage as dbUpdateCoverage,
  deleteCoverage as dbDeleteCoverage,
} from "@/lib/db/pas";

type ActionResult = { success: true } | { success: false; error: string };

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

// --- Policy Actions ---

export async function createPolicyAction(
  customerId: string,
  formData: FormData
): Promise<ActionResult> {
  const policyNumber = formData.get("policyNumber") as string;
  const type = formData.get("type") as string;
  const status = formData.get("status") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const premium = formData.get("premium") as string;
  const deductible = formData.get("deductible") as string;

  if (!policyNumber || !type || !status || !startDate || !endDate || !premium || !deductible) {
    return { success: false, error: "All fields are required." };
  }
  if (policyNumber.length > 50) return { success: false, error: "Policy number too long (max 50)." };
  if (isNaN(Number(premium))) return { success: false, error: "Premium must be a number." };
  if (isNaN(Number(deductible))) return { success: false, error: "Deductible must be a number." };

  try {
    await dbCreatePolicy(customerId, { policyNumber, type, status, startDate, endDate, premium, deductible });
    revalidatePath("/pas");
    return { success: true };
  } catch (err) {
    if (isUniqueViolation(err)) return { success: false, error: "A policy with this number already exists." };
    throw err;
  }
}

export async function updatePolicyAction(
  policyId: string,
  formData: FormData
): Promise<ActionResult> {
  const policyNumber = formData.get("policyNumber") as string;
  const type = formData.get("type") as string;
  const status = formData.get("status") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const premium = formData.get("premium") as string;
  const deductible = formData.get("deductible") as string;

  if (!policyNumber || !type || !status || !startDate || !endDate || !premium || !deductible) {
    return { success: false, error: "All fields are required." };
  }
  if (policyNumber.length > 50) return { success: false, error: "Policy number too long (max 50)." };
  if (isNaN(Number(premium))) return { success: false, error: "Premium must be a number." };
  if (isNaN(Number(deductible))) return { success: false, error: "Deductible must be a number." };

  try {
    await dbUpdatePolicy(policyId, { policyNumber, type, status, startDate, endDate, premium, deductible });
    revalidatePath("/pas");
    return { success: true };
  } catch (err) {
    if (isUniqueViolation(err)) return { success: false, error: "A policy with this number already exists." };
    throw err;
  }
}

export async function deletePolicyAction(policyId: string): Promise<ActionResult> {
  await dbDeletePolicy(policyId);
  revalidatePath("/pas");
  return { success: true };
}

// --- Vehicle Actions ---

function parseVehicleForm(formData: FormData):
  | { ok: true; data: {
      plate: string;
      vin: string;
      year: number;
      make: string;
      model: string;
      value: string | null;
      seats: number | null;
      use: string | null;
    } }
  | { ok: false; error: string } {
  const plate = formData.get("plate") as string;
  const vin = formData.get("vin") as string;
  const yearStr = formData.get("year") as string;
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const value = (formData.get("value") as string) || null;
  const seatsStr = (formData.get("seats") as string) || "";
  const use = (formData.get("use") as string) || null;

  if (!plate || !vin || !yearStr || !make || !model) {
    return { ok: false, error: "Plate, VIN, year, make, and model are required." };
  }
  if (plate.length > 10) return { ok: false, error: "Plate too long (max 10)." };
  if (vin.length > 17) return { ok: false, error: "VIN too long (max 17)." };
  if (make.length > 100) return { ok: false, error: "Make too long (max 100)." };
  if (model.length > 100) return { ok: false, error: "Model too long (max 100)." };
  if (value && isNaN(Number(value))) return { ok: false, error: "Value must be a number." };
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return { ok: false, error: "Year must be a number." };
  const seats = seatsStr ? parseInt(seatsStr, 10) : null;
  if (seats !== null && isNaN(seats)) return { ok: false, error: "Seats must be a number." };

  return { ok: true, data: { plate, vin, year, make, model, value, seats, use } };
}

export async function createVehicleAction(
  policyId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseVehicleForm(formData);
  if (!parsed.ok) return { success: false, error: parsed.error };

  await dbCreateVehicle(policyId, parsed.data);
  revalidatePath("/pas");
  return { success: true };
}

export async function updateVehicleAction(
  vehicleId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseVehicleForm(formData);
  if (!parsed.ok) return { success: false, error: parsed.error };

  await dbUpdateVehicle(vehicleId, parsed.data);
  revalidatePath("/pas");
  return { success: true };
}

export async function deleteVehicleAction(vehicleId: string): Promise<ActionResult> {
  await dbDeleteVehicle(vehicleId);
  revalidatePath("/pas");
  return { success: true };
}

// --- Claim Actions ---

export async function createClaimAction(
  policyId: string,
  formData: FormData
): Promise<ActionResult> {
  const claimNumber = formData.get("claimNumber") as string;
  const type = formData.get("type") as string;
  const status = formData.get("status") as string;
  const description = (formData.get("description") as string) || null;
  const amount = (formData.get("amount") as string) || null;
  const dateOfIncident = formData.get("dateOfIncident") as string;
  const dateFiled = formData.get("dateFiled") as string;
  const dateResolved = (formData.get("dateResolved") as string) || null;

  if (!claimNumber || !type || !status || !dateOfIncident || !dateFiled) {
    return { success: false, error: "Claim number, type, status, incident date, and filed date are required." };
  }
  if (claimNumber.length > 50) return { success: false, error: "Claim number too long (max 50)." };
  if (amount && isNaN(Number(amount))) return { success: false, error: "Amount must be a number." };

  try {
    await dbCreateClaim(policyId, { claimNumber, type, status, description, amount, dateOfIncident, dateFiled, dateResolved });
    revalidatePath("/pas");
    return { success: true };
  } catch (err) {
    if (isUniqueViolation(err)) return { success: false, error: "A claim with this number already exists." };
    throw err;
  }
}

export async function updateClaimAction(
  claimId: string,
  formData: FormData
): Promise<ActionResult> {
  const claimNumber = formData.get("claimNumber") as string;
  const type = formData.get("type") as string;
  const status = formData.get("status") as string;
  const description = (formData.get("description") as string) || null;
  const amount = (formData.get("amount") as string) || null;
  const dateOfIncident = formData.get("dateOfIncident") as string;
  const dateFiled = formData.get("dateFiled") as string;
  const dateResolved = (formData.get("dateResolved") as string) || null;

  if (!claimNumber || !type || !status || !dateOfIncident || !dateFiled) {
    return { success: false, error: "Claim number, type, status, incident date, and filed date are required." };
  }
  if (claimNumber.length > 50) return { success: false, error: "Claim number too long (max 50)." };
  if (amount && isNaN(Number(amount))) return { success: false, error: "Amount must be a number." };

  try {
    await dbUpdateClaim(claimId, { claimNumber, type, status, description, amount, dateOfIncident, dateFiled, dateResolved });
    revalidatePath("/pas");
    return { success: true };
  } catch (err) {
    if (isUniqueViolation(err)) return { success: false, error: "A claim with this number already exists." };
    throw err;
  }
}

export async function deleteClaimAction(claimId: string): Promise<ActionResult> {
  await dbDeleteClaim(claimId);
  revalidatePath("/pas");
  return { success: true };
}

// --- Coverage Actions ---

export async function createCoverageAction(
  policyId: string,
  formData: FormData
): Promise<ActionResult> {
  const type = formData.get("type") as string;
  const limitAmount = formData.get("limitAmount") as string;
  const premium = formData.get("premium") as string;

  if (!type || !limitAmount || !premium) {
    return { success: false, error: "All fields are required." };
  }
  if (isNaN(Number(limitAmount))) return { success: false, error: "Limit amount must be a number." };
  if (isNaN(Number(premium))) return { success: false, error: "Premium must be a number." };

  await dbCreateCoverage(policyId, { type, limitAmount, premium });
  revalidatePath("/pas");
  return { success: true };
}

export async function updateCoverageAction(
  coverageId: string,
  formData: FormData
): Promise<ActionResult> {
  const type = formData.get("type") as string;
  const limitAmount = formData.get("limitAmount") as string;
  const premium = formData.get("premium") as string;

  if (!type || !limitAmount || !premium) {
    return { success: false, error: "All fields are required." };
  }
  if (isNaN(Number(limitAmount))) return { success: false, error: "Limit amount must be a number." };
  if (isNaN(Number(premium))) return { success: false, error: "Premium must be a number." };

  await dbUpdateCoverage(coverageId, { type, limitAmount, premium });
  revalidatePath("/pas");
  return { success: true };
}

export async function deleteCoverageAction(coverageId: string): Promise<ActionResult> {
  await dbDeleteCoverage(coverageId);
  revalidatePath("/pas");
  return { success: true };
}
