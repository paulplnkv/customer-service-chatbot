import { db } from "@/db";
import {
  customers,
  policies,
  vehicles,
  claims,
  coverages,
} from "@/db/schema/pas";
import { eq, inArray, desc } from "drizzle-orm";

export async function getCustomerByUserId(userId: string) {
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function getPolicyNumbersByUserId(userId: string): Promise<string[]> {
  const customer = await getCustomerByUserId(userId);
  if (!customer) return [];

  const rows = await db
    .select({ policyNumber: policies.policyNumber })
    .from(policies)
    .where(eq(policies.customerId, customer.id));

  return rows.map((r) => r.policyNumber);
}

export async function getAllCustomersWithSummary() {
  const allCustomers = await db
    .select()
    .from(customers)
    .orderBy(desc(customers.createdAt));

  if (allCustomers.length === 0) {
    return [];
  }

  const customerIds = allCustomers.map((c) => c.id);
  const allPolicies = await db
    .select()
    .from(policies)
    .where(inArray(policies.customerId, customerIds));

  const policyIds = allPolicies.map((p) => p.id);

  const [allVehicles, allClaims, allCoverages] =
    policyIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(vehicles)
            .where(inArray(vehicles.policyId, policyIds)),
          db
            .select()
            .from(claims)
            .where(inArray(claims.policyId, policyIds)),
          db
            .select()
            .from(coverages)
            .where(inArray(coverages.policyId, policyIds)),
        ])
      : [[], [], []];

  return allCustomers.map((customer) => {
    const customerPolicies = allPolicies.filter(
      (p) => p.customerId === customer.id
    );

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth,
      createdAt: customer.createdAt,
      policies: customerPolicies.map((policy) => ({
        id: policy.id,
        policyNumber: policy.policyNumber,
        type: policy.type,
        status: policy.status,
        startDate: policy.startDate,
        endDate: policy.endDate,
        premium: policy.premium,
        deductible: policy.deductible,
        vehicles: allVehicles
          .filter((v) => v.policyId === policy.id)
          .map((v) => ({
            id: v.id,
            plate: v.plate,
            vin: v.vin,
            year: v.year,
            make: v.make,
            model: v.model,
            value: v.value,
            seats: v.seats,
            use: v.use,
          })),
        claims: allClaims
          .filter((c) => c.policyId === policy.id)
          .map((c) => ({
            id: c.id,
            claimNumber: c.claimNumber,
            status: c.status,
            type: c.type,
            description: c.description,
            amount: c.amount,
            dateOfIncident: c.dateOfIncident,
            dateFiled: c.dateFiled,
            dateResolved: c.dateResolved,
            paymentDate: c.paymentDate,
            paymentStatus: c.paymentStatus,
          })),
        coverages: allCoverages
          .filter((cv) => cv.policyId === policy.id)
          .map((cv) => ({
            id: cv.id,
            type: cv.type,
            limitAmount: cv.limitAmount,
            premium: cv.premium,
          })),
      })),
    };
  });
}

// --- Policy CRUD ---

export async function createPolicy(
  customerId: string,
  data: {
    policyNumber: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    premium: string;
    deductible: string;
  }
) {
  const [result] = await db
    .insert(policies)
    .values({ customerId, ...data })
    .returning();
  return result;
}

export async function updatePolicy(
  policyId: string,
  data: {
    policyNumber: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    premium: string;
    deductible: string;
  }
) {
  const [result] = await db
    .update(policies)
    .set(data)
    .where(eq(policies.id, policyId))
    .returning();
  return result;
}

export async function deletePolicy(policyId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(coverages).where(eq(coverages.policyId, policyId));
    await tx.delete(claims).where(eq(claims.policyId, policyId));
    await tx.delete(vehicles).where(eq(vehicles.policyId, policyId));
    await tx.delete(policies).where(eq(policies.id, policyId));
  });
}

// --- Vehicle CRUD ---

type VehicleData = {
  plate: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  value?: string | null;
  seats?: number | null;
  use?: string | null;
};

export async function createVehicle(policyId: string, data: VehicleData) {
  const [result] = await db
    .insert(vehicles)
    .values({ policyId, ...data })
    .returning();
  return result;
}

export async function updateVehicle(vehicleId: string, data: VehicleData) {
  const [result] = await db
    .update(vehicles)
    .set(data)
    .where(eq(vehicles.id, vehicleId))
    .returning();
  return result;
}

export async function deleteVehicle(vehicleId: string) {
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
}

// --- Claim CRUD ---

export async function createClaim(
  policyId: string,
  data: {
    claimNumber: string;
    status: string;
    type: string;
    description?: string | null;
    amount?: string | null;
    dateOfIncident: string;
    dateFiled: string;
    dateResolved?: string | null;
  }
) {
  const [result] = await db
    .insert(claims)
    .values({ policyId, ...data })
    .returning();
  return result;
}

export async function updateClaim(
  claimId: string,
  data: {
    claimNumber: string;
    status: string;
    type: string;
    description?: string | null;
    amount?: string | null;
    dateOfIncident: string;
    dateFiled: string;
    dateResolved?: string | null;
  }
) {
  const [result] = await db
    .update(claims)
    .set(data)
    .where(eq(claims.id, claimId))
    .returning();
  return result;
}

export async function deleteClaim(claimId: string) {
  await db.delete(claims).where(eq(claims.id, claimId));
}

// --- Coverage CRUD ---

export async function createCoverage(
  policyId: string,
  data: {
    type: string;
    limitAmount: string;
    premium: string;
  }
) {
  const [result] = await db
    .insert(coverages)
    .values({ policyId, ...data })
    .returning();
  return result;
}

export async function updateCoverage(
  coverageId: string,
  data: {
    type: string;
    limitAmount: string;
    premium: string;
  }
) {
  const [result] = await db
    .update(coverages)
    .set(data)
    .where(eq(coverages.id, coverageId))
    .returning();
  return result;
}

export async function deleteCoverage(coverageId: string) {
  await db.delete(coverages).where(eq(coverages.id, coverageId));
}

export async function getFullCustomerData(userId: string) {
  const customer = await getCustomerByUserId(userId);

  if (!customer) {
    return null;
  }

  const customerPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.customerId, customer.id));

  const policyIds = customerPolicies.map((p) => p.id);

  const customerInfo = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
  };

  if (policyIds.length === 0) {
    return {
      customer: customerInfo,
      policies: [],
    };
  }

  const [allVehicles, allClaims, allCoverages] = await Promise.all([
    db.select().from(vehicles).where(inArray(vehicles.policyId, policyIds)),
    db.select().from(claims).where(inArray(claims.policyId, policyIds)),
    db.select().from(coverages).where(inArray(coverages.policyId, policyIds)),
  ]);

  return {
    customer: customerInfo,
    policies: customerPolicies.map((policy) => ({
      policyNumber: policy.policyNumber,
      type: policy.type,
      status: policy.status,
      startDate: policy.startDate,
      endDate: policy.endDate,
      premium: policy.premium,
      deductible: policy.deductible,
      vehicles: allVehicles
        .filter((v) => v.policyId === policy.id)
        .map((v) => ({
          plate: v.plate,
          vin: v.vin,
          year: v.year,
          make: v.make,
          model: v.model,
          value: v.value,
          seats: v.seats,
          use: v.use,
        })),
      claims: allClaims
        .filter((c) => c.policyId === policy.id)
        .map((c) => ({
          claimNumber: c.claimNumber,
          status: c.status,
          type: c.type,
          description: c.description,
          amount: c.amount,
          dateOfIncident: c.dateOfIncident,
          dateFiled: c.dateFiled,
          dateResolved: c.dateResolved,
          paymentDate: c.paymentDate,
          paymentStatus: c.paymentStatus,
        })),
      coverages: allCoverages
        .filter((cv) => cv.policyId === policy.id)
        .map((cv) => ({
          type: cv.type,
          limitAmount: cv.limitAmount,
          premium: cv.premium,
        })),
    })),
  };
}
