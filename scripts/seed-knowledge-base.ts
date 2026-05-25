import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { knowledgeBase } from "../db/schema/knowledge-base";
import { embed } from "ai";
import { embeddingModel } from "../lib/ai/provider";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const SEED_ENTRIES = [
  {
    content: `Auto Insurance Coverage Types:

Liability Coverage: This is required in most states. It pays for injuries and property damage you cause to others in an accident. It has two components: Bodily Injury Liability (covers medical expenses, lost wages, and legal fees for people you injure) and Property Damage Liability (covers repair or replacement of other people's property you damage).

Collision Coverage: Pays to repair or replace your own vehicle after an accident with another vehicle or object, regardless of who is at fault. A deductible applies — you pay the deductible amount first, and the insurer covers the rest up to your vehicle's actual cash value.

Comprehensive Coverage: Covers damage to your vehicle from non-collision events such as theft, vandalism, fire, natural disasters, falling objects, and animal strikes. Also subject to a deductible.`,
    metadata: { topic: "coverage-types", section: "overview" },
  },
  {
    content: `Additional Auto Insurance Coverage Options:

Uninsured/Underinsured Motorist Coverage: Protects you when you're hit by a driver who has no insurance or insufficient insurance. Covers your medical bills and, in some states, vehicle repairs.

Medical Payments Coverage (MedPay): Pays for medical expenses for you and your passengers after an accident, regardless of who caused it. Covers hospital visits, surgeries, X-rays, and ambulance fees.

Rental Reimbursement Coverage: Pays for a rental car while your vehicle is being repaired after a covered claim. Typically has a daily limit (e.g., $30-$50/day) and a maximum total.

Personal Injury Protection (PIP): Required in no-fault states. Covers medical expenses, lost wages, and other costs regardless of fault. Broader than MedPay as it also covers lost income and essential services.`,
    metadata: { topic: "coverage-types", section: "additional" },
  },
  {
    content: `How to File an Auto Insurance Claim:

Step 1: Ensure Safety — Move to a safe location if possible. Call 911 if there are injuries or road hazards.

Step 2: Document the Incident — Take photos of all vehicles involved, the accident scene, road conditions, and any visible injuries. Get the other driver's name, contact info, insurance company, and policy number. Collect witness information if available.

Step 3: File a Police Report — In many states this is required, especially if there are injuries or significant damage. The police report number will be needed for your claim.

Step 4: Contact Your Insurance Company — Report the claim as soon as possible. Most insurers have 24/7 claim reporting by phone or through their mobile app. You will receive a claim number for tracking.

Step 5: Work with the Adjuster — An adjuster will be assigned to evaluate the damage, review the police report, and determine the payout. They may inspect your vehicle in person or request photos.

Step 6: Get Repairs — Once the claim is approved, you can take your vehicle to a repair shop. Some insurers have a network of preferred shops, but you can usually choose your own.

Step 7: Receive Payment — After the deductible, the insurer pays for covered repairs or the actual cash value of your vehicle if it's totaled.`,
    metadata: { topic: "claims-process", section: "how-to-file" },
  },
  {
    content: `Understanding Your Auto Insurance Premium:

Your premium is the amount you pay for your auto insurance policy, typically billed monthly or every six months. Several factors affect your premium:

Driving Record: Accidents, traffic violations, and DUI convictions increase your premium. A clean record over 3-5 years typically qualifies you for discounts.

Vehicle Type: The make, model, year, and safety features of your car affect cost. Expensive vehicles, sports cars, and cars with high theft rates cost more to insure.

Coverage Levels: Higher coverage limits and lower deductibles mean higher premiums. A $500 deductible costs more than a $1,000 deductible but means you pay less out of pocket for a claim.

Location: Urban areas with more traffic and higher crime rates typically have higher premiums. Your state's insurance regulations also play a role.

Age and Experience: Young drivers (under 25) and new drivers pay more due to higher statistical accident rates. Rates typically decrease as you age and gain experience.

Credit Score: In most states, insurers use credit-based insurance scores as a rating factor. A better credit score can mean lower premiums.

Annual Mileage: The more you drive, the higher the risk of an accident. Low-mileage discounts may be available if you drive under a certain threshold (e.g., 7,500 miles/year).`,
    metadata: { topic: "premiums", section: "factors" },
  },
  {
    content: `Common Auto Insurance Discounts:

Multi-Policy Discount (Bundling): Save 10-25% by combining auto insurance with homeowners, renters, or other policies with the same insurer.

Good Driver Discount: Available to drivers with no accidents or violations for 3-5 years. Savings of 10-20%.

Good Student Discount: Full-time students under 25 who maintain a B average or better can save 5-15%.

Defensive Driving Course: Completing an approved course can reduce your premium by 5-10%.

Anti-Theft Device Discount: Vehicles equipped with anti-theft systems, GPS tracking, or VIN etching may qualify for reduced rates.

Safety Features Discount: Cars with airbags, anti-lock brakes, and electronic stability control often receive premium reductions.

Pay-in-Full Discount: Paying your entire premium upfront instead of monthly installments can save 5-10%.

Paperless and Autopay Discounts: Opting for electronic statements and automatic payments can provide small additional savings.`,
    metadata: { topic: "discounts", section: "common" },
  },
  {
    content: `What to Do After a Car Accident — FAQ:

Q: Should I admit fault at the scene?
A: No. Be cooperative and exchange information, but do not admit fault. Fault is determined by the insurance companies and sometimes by law enforcement based on evidence.

Q: How long do I have to file a claim?
A: Most insurance companies require prompt reporting, ideally within 24-72 hours. However, statutes of limitations for claims vary by state, typically 1-3 years.

Q: Will filing a claim raise my premium?
A: It depends on the circumstances. At-fault accidents typically raise premiums for 3-5 years. Not-at-fault claims and comprehensive claims (like theft or weather damage) may not affect your rate, depending on your insurer and state.

Q: What if the other driver doesn't have insurance?
A: Your Uninsured Motorist coverage will help pay for your injuries and damages. This is why UM coverage is highly recommended even in states where it's optional.

Q: What is a total loss?
A: Your vehicle is considered a total loss when the cost to repair it exceeds its actual cash value (ACV). The insurer pays you the ACV minus your deductible instead of paying for repairs.

Q: Can I choose my own repair shop?
A: Yes, in most states you have the right to choose your own repair shop. Your insurer may recommend preferred shops that offer guarantees, but you are not required to use them.`,
    metadata: { topic: "faq", section: "after-accident" },
  },
  {
    content: `Understanding Deductibles in Auto Insurance:

A deductible is the amount you pay out of pocket before your insurance kicks in for a covered claim. For example, if you have a $500 deductible and $3,000 in damage, you pay $500 and your insurer pays $2,500.

Types of Deductibles:
- Collision Deductible: Applies when your car is damaged in an accident. Common amounts are $250, $500, or $1,000.
- Comprehensive Deductible: Applies for non-collision damage (theft, weather, vandalism). Can be set separately from your collision deductible.

Choosing Your Deductible:
- Higher deductible = lower monthly premium, but more out-of-pocket cost per claim
- Lower deductible = higher monthly premium, but less out-of-pocket cost per claim
- Choose based on your savings and how much you can comfortably pay if an accident occurs
- If your vehicle is older and has low market value, a higher deductible may make more financial sense

Important Notes:
- Deductibles do not apply to liability coverage (which pays for damage you cause to others)
- Some policies offer $0 deductible for windshield repair
- Deductibles reset per claim — if you have two separate incidents, you pay the deductible twice`,
    metadata: { topic: "deductibles", section: "overview" },
  },
];

async function seed() {
  console.log("Seeding knowledge base...\n");

  // Clear existing entries
  await db.delete(knowledgeBase);
  console.log("Cleared existing knowledge base entries.\n");

  for (const entry of SEED_ENTRIES) {
    console.log(`Embedding: ${entry.metadata.topic}/${entry.metadata.section}...`);

    const { embedding } = await embed({
      model: embeddingModel,
      value: entry.content,
    });

    await db.insert(knowledgeBase).values({
      content: entry.content,
      embedding,
      metadata: entry.metadata,
    });

    console.log(`  Stored (${entry.content.length} chars)\n`);
  }

  console.log(`\nDone! Seeded ${SEED_ENTRIES.length} knowledge base entries.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
