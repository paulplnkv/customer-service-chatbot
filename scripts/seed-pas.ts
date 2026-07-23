import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  customers,
  policies,
  vehicles,
  claims,
  coverages,
  claimDocuments,
} from "../db/schema/pas";
import { user, account } from "../db/schema/auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { CLAIM_DOCUMENTS } from "./data/claim-documents";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const SEED_PASSWORD = "password123";

// Sterling Auto Insurance sample policyholders. The first account (Alex Morgan)
// is the primary demo user and drives both customer-service journeys:
//   - an APPROVED claim with a scheduled payout ("when will my payment arrive?")
//   - an IN-REVIEW claim ("what's the progress, can I influence it?")
//   - a DENIED claim whose loss predates coverage ("can I renew now so it's
//     approved?" → no; renewal is forward-looking → escalate to a human agent)
const MOCK_DATA = [
  {
    customer: {
      userId: "seed-user-1",
      firstName: "Alex",
      lastName: "Morgan",
      email: "alex.morgan@example.com",
      phone: "(415) 555-0142",
      address: "1847 Larkin St, Apt 4, San Francisco, CA 94109",
      dateOfBirth: "1991-03-18",
    },
    policies: [
      {
        policyNumber: "STER-AUTO-2026-00100",
        type: "personal-auto",
        status: "active",
        startDate: "2026-02-01",
        endDate: "2027-02-01",
        premium: "1684.00",
        deductible: "500.00",
        vehicles: [
          {
            plate: "8KQM214",
            vin: "2T3W1RFV5NW123456",
            year: 2022,
            make: "Toyota",
            model: "RAV4 XLE",
            value: "31500.00",
            seats: 5,
            use: "Commute & Personal",
          },
        ],
        claims: [
          {
            claimNumber: "STER-CLM-2026-0001",
            status: "approved",
            type: "comprehensive-glass",
            description:
              "Windshield cracked by road debris on the highway. Comprehensive glass claim — approved; payout issued to the repair shop.",
            amount: "680.00",
            dateOfIncident: "2026-05-12",
            dateFiled: "2026-05-13",
            dateResolved: "2026-06-24",
            paymentDate: "2026-07-02",
            paymentStatus: "scheduled",
          },
          {
            claimNumber: "STER-CLM-2026-0002",
            status: "in_review",
            type: "collision",
            description:
              "Rear-ended while stopped at a light; rear bumper and tailgate damage. Adjuster assigned; awaiting the repair shop's estimate and the customer's photos before the review can be completed.",
            amount: "3400.00",
            dateOfIncident: "2026-06-18",
            dateFiled: "2026-06-20",
            dateResolved: null,
            paymentDate: null,
            paymentStatus: null,
          },
          {
            claimNumber: "STER-CLM-2026-0003",
            status: "denied",
            type: "collision",
            description:
              "Single-vehicle collision with a guardrail. Denied: no coverage was in force on the date of loss — the incident occurred Jan 10, 2026, before this Sterling policy took effect on Feb 1, 2026.",
            amount: "2850.00",
            dateOfIncident: "2026-01-10",
            dateFiled: "2026-01-12",
            dateResolved: "2026-01-22",
            paymentDate: null,
            paymentStatus: null,
          },
        ],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "250000.00", premium: "612.00" },
          { type: "property_damage_liability", limitAmount: "100000.00", premium: "328.00" },
          { type: "collision", limitAmount: "31500.00", premium: "456.00" },
          { type: "comprehensive", limitAmount: "31500.00", premium: "188.00" },
          { type: "uninsured_motorist", limitAmount: "250000.00", premium: "74.00" },
          { type: "medical_payments", limitAmount: "10000.00", premium: "26.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-2",
      firstName: "Maria",
      lastName: "Gonzalez",
      email: "maria.gonzalez@example.com",
      phone: "(312) 555-0178",
      address: "920 W Belmont Ave, Chicago, IL 60657",
      dateOfBirth: "1986-09-04",
    },
    policies: [
      {
        policyNumber: "STER-AUTO-2026-00214",
        type: "personal-auto",
        status: "active",
        startDate: "2026-03-01",
        endDate: "2027-03-01",
        premium: "1322.00",
        deductible: "1000.00",
        vehicles: [
          {
            plate: "GZ49120",
            vin: "19XFC2F59ME034221",
            year: 2021,
            make: "Honda",
            model: "Civic EX",
            value: "23800.00",
            seats: 5,
            use: "Commute",
          },
        ],
        claims: [],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "100000.00", premium: "498.00" },
          { type: "property_damage_liability", limitAmount: "50000.00", premium: "276.00" },
          { type: "collision", limitAmount: "23800.00", premium: "352.00" },
          { type: "comprehensive", limitAmount: "23800.00", premium: "144.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-3",
      firstName: "James",
      lastName: "Carter",
      email: "james.carter@example.com",
      phone: "(206) 555-0133",
      address: "455 Lakeview Dr, Bellevue, WA 98004",
      dateOfBirth: "1979-12-22",
    },
    policies: [
      {
        policyNumber: "STER-AUTO-2026-00337",
        type: "high-value-auto",
        status: "active",
        startDate: "2026-01-15",
        endDate: "2027-01-15",
        premium: "2940.00",
        deductible: "1000.00",
        vehicles: [
          {
            plate: "BMW7X5",
            vin: "5UXCR6C09P9A12345",
            year: 2023,
            make: "BMW",
            model: "X5 xDrive40i",
            value: "68500.00",
            seats: 5,
            use: "Personal",
          },
        ],
        claims: [
          {
            claimNumber: "STER-CLM-2026-0010",
            status: "approved",
            type: "comprehensive",
            description:
              "Hail damage to hood and roof during a spring storm. Comprehensive claim approved and paid.",
            amount: "4120.00",
            dateOfIncident: "2026-04-02",
            dateFiled: "2026-04-03",
            dateResolved: "2026-04-29",
            paymentDate: "2026-05-06",
            paymentStatus: "paid",
          },
        ],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "500000.00", premium: "880.00" },
          { type: "property_damage_liability", limitAmount: "250000.00", premium: "512.00" },
          { type: "collision", limitAmount: "68500.00", premium: "1020.00" },
          { type: "comprehensive", limitAmount: "68500.00", premium: "428.00" },
          { type: "uninsured_motorist", limitAmount: "500000.00", premium: "100.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-4",
      firstName: "Pinnacle Delivery Services",
      lastName: "LLC",
      email: "fleet@pinnacledelivery.example",
      phone: "(801) 555-0188",
      address: "2850 Commerce Pkwy, Suite 120, Salt Lake City, UT 84117",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STER-FLEET-2026-00881",
        type: "commercial-fleet",
        status: "active",
        startDate: "2026-03-15",
        endDate: "2027-03-15",
        premium: "18450.00",
        deductible: "2500.00",
        vehicles: [
          {
            plate: "PDS1001",
            vin: "1FTBW2CM5NKA10011",
            year: 2022,
            make: "Ford",
            model: "Transit 250 Cargo",
            value: "46200.00",
            seats: 2,
            use: "Local Delivery",
          },
          {
            plate: "PDS1002",
            vin: "1FTBW2CM5NKA10022",
            year: 2022,
            make: "Ford",
            model: "Transit 250 Cargo",
            value: "46200.00",
            seats: 2,
            use: "Local Delivery",
          },
          {
            plate: "PDS1003",
            vin: "3C6TRVDG6NE100333",
            year: 2021,
            make: "Ram",
            model: "ProMaster 1500",
            value: "38900.00",
            seats: 2,
            use: "Local Delivery",
          },
        ],
        claims: [
          {
            claimNumber: "STER-CLM-2026-0021",
            status: "in_review",
            type: "collision",
            description:
              "Backed into a loading dock bollard; rear door damage on unit PDS1002. Under review pending the body-shop estimate.",
            amount: "2100.00",
            dateOfIncident: "2026-06-09",
            dateFiled: "2026-06-10",
            dateResolved: null,
            paymentDate: null,
            paymentStatus: null,
          },
        ],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "1000000.00", premium: "8200.00" },
          { type: "property_damage_liability", limitAmount: "500000.00", premium: "4100.00" },
          { type: "collision", limitAmount: "131300.00", premium: "3800.00" },
          { type: "comprehensive", limitAmount: "131300.00", premium: "1650.00" },
          { type: "hired_non_owned_auto", limitAmount: "1000000.00", premium: "700.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-5",
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@example.com",
      phone: "(919) 555-0107",
      address: "1830 Commerce Blvd, Apt 220, Raleigh, NC 27601",
      dateOfBirth: "1994-07-30",
    },
    policies: [
      {
        policyNumber: "STER-AUTO-2026-00455",
        type: "personal-auto",
        status: "active",
        startDate: "2026-02-20",
        endDate: "2027-02-20",
        premium: "1198.00",
        deductible: "500.00",
        vehicles: [
          {
            plate: "SUB2020",
            vin: "4S4BTAFC2L3201991",
            year: 2020,
            make: "Subaru",
            model: "Outback Premium",
            value: "26400.00",
            seats: 5,
            use: "Commute & Personal",
          },
        ],
        claims: [],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "100000.00", premium: "452.00" },
          { type: "property_damage_liability", limitAmount: "50000.00", premium: "248.00" },
          { type: "collision", limitAmount: "26400.00", premium: "318.00" },
          { type: "comprehensive", limitAmount: "26400.00", premium: "136.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-6",
      firstName: "David",
      lastName: "Park",
      email: "david.park@example.com",
      phone: "(408) 555-0151",
      address: "560 N 1st St, San Jose, CA 95112",
      dateOfBirth: "1990-11-08",
    },
    policies: [
      {
        policyNumber: "STER-RIDE-2026-00512",
        type: "rideshare-auto",
        status: "active",
        startDate: "2026-04-01",
        endDate: "2027-04-01",
        premium: "2260.00",
        deductible: "1000.00",
        vehicles: [
          {
            plate: "RDS8841",
            vin: "4T1G11AK7NU654321",
            year: 2022,
            make: "Toyota",
            model: "Camry SE",
            value: "29900.00",
            seats: 5,
            use: "Rideshare & Personal",
          },
        ],
        claims: [],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "250000.00", premium: "820.00" },
          { type: "property_damage_liability", limitAmount: "100000.00", premium: "440.00" },
          { type: "collision", limitAmount: "29900.00", premium: "560.00" },
          { type: "comprehensive", limitAmount: "29900.00", premium: "240.00" },
          { type: "rideshare_gap", limitAmount: "50000.00", premium: "200.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-7",
      firstName: "Robert & Linda",
      lastName: "Thompson",
      email: "thompson.family@example.com",
      phone: "(503) 555-0141",
      address: "8820 Maple Ridge Ln, Hillsboro, OR 97124",
      dateOfBirth: "1972-05-19",
    },
    policies: [
      {
        policyNumber: "STER-AUTO-2026-00603",
        type: "multi-vehicle-package",
        status: "active",
        startDate: "2026-05-01",
        endDate: "2027-05-01",
        premium: "2480.00",
        deductible: "500.00",
        vehicles: [
          {
            plate: "THM4421",
            vin: "1GNEVHKW6NJ100221",
            year: 2022,
            make: "Chevrolet",
            model: "Traverse LT",
            value: "37800.00",
            seats: 7,
            use: "Family",
          },
          {
            plate: "THM4422",
            vin: "JTDEPMAE7NJ200882",
            year: 2021,
            make: "Toyota",
            model: "Corolla LE",
            value: "21300.00",
            seats: 5,
            use: "Commute",
          },
        ],
        claims: [
          {
            claimNumber: "STER-CLM-2026-0030",
            status: "approved",
            type: "comprehensive",
            description:
              "Tree branch fell on the Traverse during a windstorm. Comprehensive claim approved; payout scheduled.",
            amount: "1980.00",
            dateOfIncident: "2026-05-28",
            dateFiled: "2026-05-29",
            dateResolved: "2026-06-22",
            paymentDate: "2026-06-30",
            paymentStatus: "scheduled",
          },
        ],
        coverages: [
          { type: "bodily_injury_liability", limitAmount: "250000.00", premium: "760.00" },
          { type: "property_damage_liability", limitAmount: "100000.00", premium: "420.00" },
          { type: "collision", limitAmount: "59100.00", premium: "690.00" },
          { type: "comprehensive", limitAmount: "59100.00", premium: "300.00" },
          { type: "medical_payments", limitAmount: "10000.00", premium: "40.00" },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding PAS data...\n");

  // Hash the shared seed password once
  const hashedPassword = await hashPassword(SEED_PASSWORD);

  // Clear existing data in reverse dependency order
  await db.delete(coverages);
  await db.delete(claimDocuments);
  await db.delete(claims);
  await db.delete(vehicles);
  await db.delete(policies);
  await db.delete(customers);
  // Clear seed auth users (only those with seed-user- prefix)
  for (let i = 1; i <= MOCK_DATA.length; i++) {
    const seedUserId = `seed-user-${i}`;
    await db.delete(account).where(eq(account.userId, seedUserId));
    await db.delete(user).where(eq(user.id, seedUserId));
  }
  console.log("Cleared existing PAS + auth seed data.\n");

  for (const entry of MOCK_DATA) {
    const { userId, firstName, lastName, email } = entry.customer;

    // Create auth user
    await db.insert(user).values({
      id: userId,
      name: `${firstName} ${lastName}`,
      email,
      emailVerified: true,
    });

    // Create credential account
    await db.insert(account).values({
      id: `${userId}-credential`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
    });

    console.log(`Creating user + customer: ${firstName} ${lastName} (${email} / ${SEED_PASSWORD})...`);

    const [customer] = await db
      .insert(customers)
      .values(entry.customer)
      .returning({ id: customers.id });

    for (const policyData of entry.policies) {
      const { vehicles: vehicleData, claims: claimData, coverages: coverageData, ...policyValues } = policyData;

      const [policy] = await db
        .insert(policies)
        .values({ ...policyValues, customerId: customer.id })
        .returning({ id: policies.id });

      if (vehicleData.length > 0) {
        await db.insert(vehicles).values(
          vehicleData.map((v) => ({ ...v, policyId: policy.id }))
        );
        console.log(`  Added ${vehicleData.length} vehicle(s) to ${policyValues.policyNumber}`);
      }

      if (claimData.length > 0) {
        const insertedClaims = await db
          .insert(claims)
          .values(claimData.map((c) => ({ ...c, policyId: policy.id })))
          .returning({ id: claims.id, claimNumber: claims.claimNumber });
        console.log(`  Added ${claimData.length} claim(s) to ${policyValues.policyNumber}`);

        // Attach case documents/photos to the claims that have them.
        for (const inserted of insertedClaims) {
          const docs = CLAIM_DOCUMENTS[inserted.claimNumber];
          if (!docs?.length) continue;
          await db.insert(claimDocuments).values(
            docs.map((d) => ({
              claimId: inserted.id,
              kind: d.kind,
              title: d.title,
              url: d.url,
              docDate: d.docDate,
            }))
          );
          console.log(`    Added ${docs.length} document(s) to ${inserted.claimNumber}`);
        }
      }

      if (coverageData.length > 0) {
        await db.insert(coverages).values(
          coverageData.map((cv) => ({ ...cv, policyId: policy.id }))
        );
        console.log(`  Added ${coverageData.length} coverage(s) to ${policyValues.policyNumber}`);
      }
    }

    console.log();
  }

  console.log(`Done! Seeded ${MOCK_DATA.length} customers with policies, vehicles, claims, and coverages.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("PAS seed failed:", err);
  process.exit(1);
});
