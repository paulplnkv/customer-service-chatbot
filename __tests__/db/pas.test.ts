import { describe, it, expect } from "vitest";
import { getCustomerByUserId, getFullCustomerData } from "@/lib/db/pas";
import { getSeededTestUserId } from "../helpers/db-setup";

describe("PAS query functions", () => {
  describe("getCustomerByUserId", () => {
    it("returns null for non-existent user", async () => {
      const result = await getCustomerByUserId("non-existent-user-id");
      expect(result).toBeNull();
    });

    it("returns customer for valid seeded userId", async () => {
      const userId = await getSeededTestUserId();
      expect(userId, "No seeded data found. Run: npm run db:seed:pas").toBeTruthy();
      const customer = await getCustomerByUserId(userId!);
      expect(customer).not.toBeNull();
      expect(customer!.userId).toBe(userId);
      expect(customer!.firstName).toBeTruthy();
      expect(customer!.lastName).toBeTruthy();
      expect(customer!.email).toBeTruthy();
    });
  });

  describe("getFullCustomerData", () => {
    it("returns null for non-existent user", async () => {
      const result = await getFullCustomerData("non-existent-user-id");
      expect(result).toBeNull();
    });

    it("returns complete customer data for valid userId", async () => {
      const userId = await getSeededTestUserId();
      expect(userId, "No seeded data found. Run: npm run db:seed:pas").toBeTruthy();

      const data = await getFullCustomerData(userId!);
      expect(data).not.toBeNull();

      // Customer info
      expect(data!.customer).toBeDefined();
      expect(data!.customer.firstName).toBeTruthy();
      expect(data!.customer.email).toBeTruthy();

      // Policies array
      expect(data!.policies).toBeDefined();
      expect(Array.isArray(data!.policies)).toBe(true);
      expect(data!.policies.length).toBeGreaterThan(0);

      // Each policy should have sub-arrays
      const firstPolicy = data!.policies[0];
      expect(firstPolicy.policyNumber).toBeTruthy();
      expect(firstPolicy.status).toBeTruthy();
      expect(Array.isArray(firstPolicy.aircraft)).toBe(true);
      expect(Array.isArray(firstPolicy.claims)).toBe(true);
      expect(Array.isArray(firstPolicy.coverages)).toBe(true);
    });

    it("does not expose customer date of birth or ID", async () => {
      const userId = await getSeededTestUserId();
      expect(userId, "No seeded data found. Run: npm run db:seed:pas").toBeTruthy();

      const data = await getFullCustomerData(userId!);
      expect(data).not.toBeNull();

      // These fields should NOT be in the customer response
      const customerKeys = Object.keys(data!.customer);
      expect(customerKeys).not.toContain("id");
      expect(customerKeys).not.toContain("dateOfBirth");
      expect(customerKeys).not.toContain("createdAt");
    });
  });
});
