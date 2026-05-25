import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { customers, policies, vehicles, claims, coverages } from "../db/schema/pas";
import { user, account } from "../db/schema/auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const SEED_PASSWORD = "password123";

const MOCK_DATA = [
  {
    customer: {
      userId: "seed-user-1",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "(555) 123-4567",
      address: "742 Evergreen Terrace, Springfield, IL 62704",
      dateOfBirth: "1985-03-15",
    },
    policies: [
      {
        policyNumber: "AUTO-2024-001",
        type: "auto",
        status: "active",
        startDate: "2024-01-15",
        endDate: "2025-01-15",
        premium: "1250.00",
        deductible: "500.00",
        vehicles: [
          {
            make: "Toyota",
            model: "Camry",
            year: 2022,
            vin: "4T1BF1FK3CU123456",
            licensePlate: "ABC-1234",
            color: "Silver",
          },
          {
            make: "Honda",
            model: "CR-V",
            year: 2023,
            vin: "2HKRW2H53MH654321",
            licensePlate: "XYZ-5678",
            color: "Blue",
          },
        ],
        claims: [
          {
            claimNumber: "CLM-2024-0001",
            status: "closed",
            type: "collision",
            description: "Rear-ended at stoplight on Main Street. Minor bumper damage to Toyota Camry.",
            amount: "2800.00",
            dateOfIncident: "2024-06-12",
            dateFiled: "2024-06-13",
            dateResolved: "2024-07-20",
          },
        ],
        coverages: [
          { type: "liability", limitAmount: "100000.00", premium: "450.00" },
          { type: "collision", limitAmount: "50000.00", premium: "320.00" },
          { type: "comprehensive", limitAmount: "50000.00", premium: "180.00" },
          { type: "uninsured_motorist", limitAmount: "100000.00", premium: "150.00" },
          { type: "medical_payments", limitAmount: "10000.00", premium: "75.00" },
          { type: "rental", limitAmount: "1500.00", premium: "75.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-2",
      firstName: "Robert",
      lastName: "Johnson",
      email: "robert.johnson@example.com",
      phone: "(555) 234-5678",
      address: "1600 Pennsylvania Ave, Washington, DC 20500",
      dateOfBirth: "1972-11-08",
    },
    policies: [
      {
        policyNumber: "AUTO-2024-002",
        type: "auto",
        status: "active",
        startDate: "2024-03-01",
        endDate: "2025-03-01",
        premium: "980.00",
        deductible: "1000.00",
        vehicles: [
          {
            make: "Ford",
            model: "F-150",
            year: 2021,
            vin: "1FTEW1EP5MFA98765",
            licensePlate: "TRK-9012",
            color: "Red",
          },
        ],
        claims: [
          {
            claimNumber: "CLM-2024-0002",
            status: "in_review",
            type: "comprehensive",
            description: "Hail damage to roof and hood during severe thunderstorm.",
            amount: "4500.00",
            dateOfIncident: "2024-09-05",
            dateFiled: "2024-09-06",
            dateResolved: null,
          },
          {
            claimNumber: "CLM-2024-0003",
            status: "approved",
            type: "collision",
            description: "Side-swiped in parking lot. Driver side door and fender damaged.",
            amount: "3200.00",
            dateOfIncident: "2024-04-18",
            dateFiled: "2024-04-19",
            dateResolved: "2024-05-25",
          },
        ],
        coverages: [
          { type: "liability", limitAmount: "50000.00", premium: "350.00" },
          { type: "collision", limitAmount: "40000.00", premium: "280.00" },
          { type: "comprehensive", limitAmount: "40000.00", premium: "150.00" },
          { type: "uninsured_motorist", limitAmount: "50000.00", premium: "100.00" },
          { type: "medical_payments", limitAmount: "5000.00", premium: "50.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-3",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@example.com",
      phone: "(555) 345-6789",
      address: "456 Oak Boulevard, Austin, TX 78701",
      dateOfBirth: "1990-07-22",
    },
    policies: [
      {
        policyNumber: "AUTO-2024-003",
        type: "auto",
        status: "active",
        startDate: "2024-06-01",
        endDate: "2025-06-01",
        premium: "1480.00",
        deductible: "500.00",
        vehicles: [
          {
            make: "Tesla",
            model: "Model 3",
            year: 2024,
            vin: "5YJ3E1EA8PF111222",
            licensePlate: "EV-3344",
            color: "White",
          },
          {
            make: "Chevrolet",
            model: "Equinox",
            year: 2020,
            vin: "3GNAXKEV1LS222333",
            licensePlate: "SUV-7788",
            color: "Black",
          },
          {
            make: "Volkswagen",
            model: "Jetta",
            year: 2019,
            vin: "3VWC57BU3KM333444",
            licensePlate: "VW-1122",
            color: "Gray",
          },
        ],
        claims: [],
        coverages: [
          { type: "liability", limitAmount: "250000.00", premium: "520.00" },
          { type: "collision", limitAmount: "75000.00", premium: "380.00" },
          { type: "comprehensive", limitAmount: "75000.00", premium: "240.00" },
          { type: "uninsured_motorist", limitAmount: "250000.00", premium: "180.00" },
          { type: "medical_payments", limitAmount: "25000.00", premium: "85.00" },
          { type: "rental", limitAmount: "2000.00", premium: "75.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-4",
      firstName: "David",
      lastName: "Chen",
      email: "david.chen@example.com",
      phone: "(555) 456-7890",
      address: "789 Pine Street, San Francisco, CA 94102",
      dateOfBirth: "1988-01-30",
    },
    policies: [
      {
        policyNumber: "AUTO-2023-010",
        type: "auto",
        status: "expired",
        startDate: "2023-02-01",
        endDate: "2024-02-01",
        premium: "1100.00",
        deductible: "750.00",
        vehicles: [
          {
            make: "BMW",
            model: "330i",
            year: 2021,
            vin: "WBA5R1C56M7D44555",
            licensePlate: "LUX-4455",
            color: "Midnight Blue",
          },
        ],
        claims: [
          {
            claimNumber: "CLM-2023-0010",
            status: "denied",
            type: "collision",
            description: "Collision with deer on highway. Front-end damage. Claim denied — incident occurred after policy expiration.",
            amount: "6800.00",
            dateOfIncident: "2024-02-15",
            dateFiled: "2024-02-16",
            dateResolved: "2024-03-01",
          },
        ],
        coverages: [
          { type: "liability", limitAmount: "100000.00", premium: "420.00" },
          { type: "collision", limitAmount: "60000.00", premium: "350.00" },
          { type: "comprehensive", limitAmount: "60000.00", premium: "200.00" },
        ],
      },
      {
        policyNumber: "AUTO-2024-010",
        type: "auto",
        status: "active",
        startDate: "2024-04-01",
        endDate: "2025-04-01",
        premium: "1350.00",
        deductible: "500.00",
        vehicles: [
          {
            make: "BMW",
            model: "330i",
            year: 2021,
            vin: "WBA5R1C56M7D44555",
            licensePlate: "LUX-4455",
            color: "Midnight Blue",
          },
        ],
        claims: [],
        coverages: [
          { type: "liability", limitAmount: "100000.00", premium: "450.00" },
          { type: "collision", limitAmount: "60000.00", premium: "380.00" },
          { type: "comprehensive", limitAmount: "60000.00", premium: "220.00" },
          { type: "uninsured_motorist", limitAmount: "100000.00", premium: "150.00" },
          { type: "medical_payments", limitAmount: "10000.00", premium: "75.00" },
          { type: "rental", limitAmount: "1500.00", premium: "75.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-5",
      firstName: "Sarah",
      lastName: "Williams",
      email: "sarah.williams@example.com",
      phone: "(555) 567-8901",
      address: "321 Maple Drive, Denver, CO 80202",
      dateOfBirth: "1995-09-14",
    },
    policies: [
      {
        policyNumber: "AUTO-2024-005",
        type: "auto",
        status: "active",
        startDate: "2024-08-01",
        endDate: "2025-08-01",
        premium: "890.00",
        deductible: "1000.00",
        vehicles: [
          {
            make: "Subaru",
            model: "Outback",
            year: 2022,
            vin: "4S4BTAPC3N3555666",
            licensePlate: "MTN-2233",
            color: "Forest Green",
          },
          {
            make: "Mazda",
            model: "MX-5 Miata",
            year: 2023,
            vin: "JM1NDAD71P0777888",
            licensePlate: "FUN-9900",
            color: "Soul Red",
          },
        ],
        claims: [
          {
            claimNumber: "CLM-2024-0005",
            status: "open",
            type: "comprehensive",
            description: "Windshield cracked by rock debris on I-70. Subaru Outback.",
            amount: "850.00",
            dateOfIncident: "2024-11-02",
            dateFiled: "2024-11-03",
            dateResolved: null,
          },
        ],
        coverages: [
          { type: "liability", limitAmount: "50000.00", premium: "300.00" },
          { type: "collision", limitAmount: "35000.00", premium: "250.00" },
          { type: "comprehensive", limitAmount: "35000.00", premium: "140.00" },
          { type: "uninsured_motorist", limitAmount: "50000.00", premium: "100.00" },
          { type: "medical_payments", limitAmount: "5000.00", premium: "50.00" },
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
        await db.insert(claims).values(
          claimData.map((c) => ({ ...c, policyId: policy.id }))
        );
        console.log(`  Added ${claimData.length} claim(s) to ${policyValues.policyNumber}`);
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
