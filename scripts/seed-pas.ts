import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { customers, policies, aircraft, claims, coverages } from "../db/schema/pas";
import { user, account } from "../db/schema/auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const SEED_PASSWORD = "password123";

// Aviation policyholders sourced from the STR / Starr Aviation sample policy
// declarations (demo/Policies/*.docx). Coverages with an "Included" premium in
// the source are seeded with a premium of "0.00".
const MOCK_DATA = [
  {
    customer: {
      userId: "seed-user-1",
      firstName: "Robert J.",
      lastName: "Harrington",
      email: "robert.harrington@example.com",
      phone: "(480) 555-0147",
      address: "4312 Meadow Lane, Scottsdale, AZ 85251",
      dateOfBirth: "1968-05-12",
    },
    policies: [
      {
        policyNumber: "STAR-GA-2024-00447",
        type: "ga-hull-liability",
        status: "active",
        startDate: "2024-01-01",
        endDate: "2025-01-01",
        premium: "5245.00",
        deductible: "2500.00",
        aircraft: [
          {
            registration: "N6148R",
            serialNumber: "172S12345",
            year: 2018,
            make: "Cessna",
            model: "172S Skyhawk SP",
            hullValue: "285000.00",
            seats: 4,
            primaryUse: "Pleasure & Business",
          },
        ],
        claims: [
          {
            claimNumber: "STAR-CLM-2024-0447",
            status: "closed",
            type: "hull-not-in-flight",
            description:
              "Hangar door struck the left wingtip during ground handling. Not-in-flight hull claim; repaired and closed.",
            amount: "8200.00",
            dateOfIncident: "2024-08-03",
            dateFiled: "2024-08-05",
            dateResolved: "2024-09-18",
          },
        ],
        coverages: [
          { type: "hull_in_flight", limitAmount: "285000.00", premium: "3820.00" },
          { type: "hull_not_in_flight", limitAmount: "285000.00", premium: "0.00" },
          { type: "bodily_injury_liability", limitAmount: "1000000.00", premium: "1240.00" },
          { type: "property_damage_liability", limitAmount: "1000000.00", premium: "0.00" },
          { type: "medical_payments", limitAmount: "10000.00", premium: "185.00" },
          { type: "passenger_liability", limitAmount: "300000.00", premium: "0.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-2",
      firstName: "Pinnacle Air Charter",
      lastName: "LLC",
      email: "ops@pinnacleaircharter.example",
      phone: "(801) 555-0188",
      address: "2850 Executive Pkwy, Suite 300, Salt Lake City, UT 84117",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STAR-135-2024-00881",
        type: "part135-charter-fleet",
        status: "active",
        startDate: "2024-03-15",
        endDate: "2025-03-15",
        premium: "258300.00",
        deductible: "25000.00",
        aircraft: [
          {
            registration: "N412PC",
            serialNumber: "1946",
            year: 2020,
            make: "Pilatus",
            model: "PC-12 NG",
            hullValue: "4200000.00",
            seats: null,
            primaryUse: "Charter / Cargo",
          },
          {
            registration: "N631CJ",
            serialNumber: "525C-0238",
            year: 2019,
            make: "Cessna",
            model: "Citation CJ3+",
            hullValue: "5800000.00",
            seats: null,
            primaryUse: "Charter — Pax",
          },
          {
            registration: "N350PA",
            serialNumber: "FL-1034",
            year: 2017,
            make: "Beechcraft",
            model: "King Air 350",
            hullValue: "3100000.00",
            seats: null,
            primaryUse: "Charter / Medevac",
          },
        ],
        claims: [],
        coverages: [
          { type: "hull_in_flight_all_risk", limitAmount: "13100000.00", premium: "148200.00" },
          { type: "third_party_bodily_injury_property_damage", limitAmount: "50000000.00", premium: "82500.00" },
          { type: "passenger_liability", limitAmount: "20000000.00", premium: "0.00" },
          { type: "crew_personal_accident", limitAmount: "500000.00", premium: "9800.00" },
          { type: "war_and_allied_perils", limitAmount: "10000000.00", premium: "14600.00" },
          { type: "ground_support_equipment", limitAmount: "450000.00", premium: "3200.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-3",
      firstName: "Apex Aerospace Components",
      lastName: "Inc.",
      email: "risk@apexaerospace.example",
      phone: "(316) 555-0122",
      address: "6700 Innovation Drive, Wichita, KS 67226",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STAR-APL-2024-02214",
        type: "aerospace-products-liability",
        status: "active",
        startDate: "2024-07-01",
        endDate: "2025-07-01",
        premium: "1760000.00",
        deductible: "500000.00",
        aircraft: [],
        claims: [
          {
            claimNumber: "STAR-CLM-2024-2214",
            status: "in_review",
            type: "products-liability",
            description:
              "Claims-made notice: alleged hydraulic actuator defect on a regional jet. Under review; reported within the policy period.",
            amount: null,
            dateOfIncident: "2024-10-09",
            dateFiled: "2024-10-15",
            dateResolved: null,
          },
        ],
        coverages: [
          { type: "products_completed_operations_liability", limitAmount: "200000000.00", premium: "1248000.00" },
          { type: "grounding_liability", limitAmount: "50000000.00", premium: "388000.00" },
          { type: "product_recall_expense", limitAmount: "5000000.00", premium: "124000.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-4",
      firstName: "SkyGate Aviation Services",
      lastName: "Inc.",
      email: "insurance@skygate-fbo.example",
      phone: "(303) 555-0163",
      address: "1 Control Tower Rd, Suite 100, Englewood, CO 80112",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STAR-FBO-2024-00663",
        type: "fbo-airport-liability",
        status: "active",
        startDate: "2024-06-01",
        endDate: "2025-06-01",
        premium: "293400.00",
        deductible: "25000.00",
        aircraft: [],
        claims: [],
        coverages: [
          { type: "airport_general_liability", limitAmount: "10000000.00", premium: "68400.00" },
          { type: "hangarkeepers_liability", limitAmount: "5000000.00", premium: "88600.00" },
          { type: "products_completed_operations", limitAmount: "10000000.00", premium: "42200.00" },
          { type: "pollution_liability", limitAmount: "5000000.00", premium: "28800.00" },
          { type: "commercial_auto_liability", limitAmount: "1000000.00", premium: "9800.00" },
          { type: "fbo_property", limitAmount: "8200000.00", premium: "24400.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-5",
      firstName: "SkyView Analytics",
      lastName: "LLC",
      email: "ops@skyview-analytics.example",
      phone: "(919) 555-0107",
      address: "1830 Commerce Blvd, Suite 220, Raleigh, NC 27601",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STAR-UAS-2024-01105",
        type: "uas-commercial",
        status: "active",
        startDate: "2024-02-01",
        endDate: "2025-02-01",
        premium: "14440.00",
        deductible: "500.00",
        aircraft: [
          {
            registration: "FA3A93712D",
            serialNumber: "M300-RTK-01",
            year: 2022,
            make: "DJI",
            model: "Matrice 300 RTK",
            hullValue: "28500.00",
            seats: null,
            primaryUse: "Infrastructure Inspection",
          },
          {
            registration: "FA3B10248C",
            serialNumber: "M300-RTK-02",
            year: 2022,
            make: "DJI",
            model: "Matrice 300 RTK",
            hullValue: "31200.00",
            seats: null,
            primaryUse: "Precision Mapping",
          },
          {
            registration: "FA2C88041A",
            serialNumber: "EVO2-PRO-01",
            year: 2021,
            make: "Autel Robotics",
            model: "EVO II Pro",
            hullValue: "3800.00",
            seats: null,
            primaryUse: "Aerial Photography",
          },
          {
            registration: "FA2D00312E",
            serialNumber: "SKYDIO-2PE-01",
            year: 2021,
            make: "Skydio",
            model: "2+ Enterprise",
            hullValue: "2400.00",
            seats: null,
            primaryUse: "Structural Inspection",
          },
        ],
        claims: [],
        coverages: [
          { type: "hull_physical_damage", limitAmount: "65900.00", premium: "3840.00" },
          { type: "payload_sensor_equipment", limitAmount: "64000.00", premium: "2280.00" },
          { type: "third_party_bodily_injury_property_damage", limitAmount: "5000000.00", premium: "6400.00" },
          { type: "invasion_of_privacy_defense", limitAmount: "250000.00", premium: "1100.00" },
          { type: "non_owned_uas_liability", limitAmount: "1000000.00", premium: "820.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-6",
      firstName: "Delta Ag Aviation",
      lastName: "Inc.",
      email: "office@deltaag-aviation.example",
      phone: "(662) 555-0182",
      address: "Rte. 4 Box 88, Greenville, MS 38701",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STAR-AG-2024-00329",
        type: "agricultural-aviation",
        status: "active",
        startDate: "2024-04-01",
        endDate: "2025-04-01",
        premium: "226500.00",
        deductible: "10000.00",
        aircraft: [
          {
            registration: "N802DV",
            serialNumber: "802A-0441",
            year: 2021,
            make: "Air Tractor",
            model: "AT-802A",
            hullValue: "1100000.00",
            seats: 1,
            primaryUse: "Aerial Application",
          },
          {
            registration: "N502DA",
            serialNumber: "502B-1822",
            year: 2019,
            make: "Air Tractor",
            model: "AT-502B",
            hullValue: "620000.00",
            seats: 1,
            primaryUse: "Aerial Application",
          },
          {
            registration: "N510TA",
            serialNumber: "GE-0148",
            year: 2016,
            make: "Thrush Aircraft",
            model: "510G",
            hullValue: "480000.00",
            seats: 1,
            primaryUse: "Aerial Application",
          },
        ],
        claims: [],
        coverages: [
          { type: "hull_in_flight_all_risk", limitAmount: "2200000.00", premium: "82600.00" },
          { type: "third_party_bodily_injury_property_damage", limitAmount: "10000000.00", premium: "58400.00" },
          { type: "drift_spray_damage_liability", limitAmount: "2000000.00", premium: "48200.00" },
          { type: "crop_damage_liability", limitAmount: "1000000.00", premium: "24100.00" },
          { type: "pilot_personal_accident", limitAmount: "300000.00", premium: "8400.00" },
          { type: "ground_equipment_tender_vehicles", limitAmount: "220000.00", premium: "4800.00" },
        ],
      },
    ],
  },
  {
    customer: {
      userId: "seed-user-7",
      firstName: "Cascade Ridge Flying Club",
      lastName: "LLC",
      email: "board@cascaderidgefc.example",
      phone: "(503) 555-0141",
      address: "8820 Hangar Row, Suite 14, Hillsboro, OR 97124",
      dateOfBirth: null,
    },
    policies: [
      {
        policyNumber: "STAR-GA-2024-00891",
        type: "ga-fleet-flying-club",
        status: "active",
        startDate: "2024-05-01",
        endDate: "2025-05-01",
        premium: "44300.00",
        deductible: "7500.00",
        aircraft: [
          {
            registration: "N5527K",
            serialNumber: "18282041",
            year: 2015,
            make: "Cessna",
            model: "182T Skylane",
            hullValue: "310000.00",
            seats: 4,
            primaryUse: "Cross-Country / IFR Training",
          },
          {
            registration: "N8814W",
            serialNumber: "2843727",
            year: 2008,
            make: "Piper",
            model: "PA-28-181 Archer III",
            hullValue: "168000.00",
            seats: 4,
            primaryUse: "Local / VFR Training",
          },
          {
            registration: "N3691B",
            serialNumber: "E-3912",
            year: 2019,
            make: "Beechcraft",
            model: "A36 Bonanza",
            hullValue: "580000.00",
            seats: 6,
            primaryUse: "Pleasure & Business",
          },
          {
            registration: "N227CR",
            serialNumber: "1388",
            year: 2022,
            make: "Cirrus",
            model: "SR22T G6",
            hullValue: "895000.00",
            seats: 5,
            primaryUse: "Cross-Country / IFR",
          },
        ],
        claims: [
          {
            claimNumber: "STAR-CLM-2024-0891",
            status: "approved",
            type: "hull-in-flight",
            description:
              "Prop strike on the Cirrus SR22T (N227CR) following a gear-up taxi incident. Engine tear-down endorsement applied; claim approved.",
            amount: "62000.00",
            dateOfIncident: "2024-07-22",
            dateFiled: "2024-07-23",
            dateResolved: "2024-09-30",
          },
        ],
        coverages: [
          { type: "hull_all_risk_agreed_value", limitAmount: "1953000.00", premium: "35240.00" },
          { type: "bodily_injury_property_damage_liability", limitAmount: "2000000.00", premium: "8460.00" },
          { type: "passenger_liability", limitAmount: "500000.00", premium: "0.00" },
          { type: "medical_payments", limitAmount: "10000.00", premium: "600.00" },
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
  await db.delete(aircraft);
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
      const { aircraft: aircraftData, claims: claimData, coverages: coverageData, ...policyValues } = policyData;

      const [policy] = await db
        .insert(policies)
        .values({ ...policyValues, customerId: customer.id })
        .returning({ id: policies.id });

      if (aircraftData.length > 0) {
        await db.insert(aircraft).values(
          aircraftData.map((a) => ({ ...a, policyId: policy.id }))
        );
        console.log(`  Added ${aircraftData.length} aircraft to ${policyValues.policyNumber}`);
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

  console.log(`Done! Seeded ${MOCK_DATA.length} customers with policies, aircraft, claims, and coverages.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("PAS seed failed:", err);
  process.exit(1);
});
