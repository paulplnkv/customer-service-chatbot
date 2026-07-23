// The single source of truth for every demo claim asset: incident photos and
// case paperwork, keyed by claim number.
//
// Regenerate the files with:   npm run assets:claims
// (see scripts/generate-claim-assets.ts for --claim / --only / --force)
//
// Rule encoded here: anything whose text has to be legible and correct — VIN
// plates, estimates, reports, letters — is *rendered* from a template so the
// numbers always match scripts/seed-pas.ts. The image model is only ever asked
// to draw damage and scenes, never text.
//
// scripts/data/claim-documents.ts derives the DB seed rows from this manifest,
// so a filename can never drift from what the generator wrote.

import type { TemplateData } from "../lib/doc-templates";

export type PhotoAsset = {
  source: "ai";
  kind: "photo";
  file: string;
  title: string;
  docDate: string;
  prompt: string;
  aspect?: "landscape" | "portrait" | "square";
};

export type RenderAsset = {
  source: "render";
  kind: "photo" | "document";
  file: string;
  title: string;
  docDate: string;
  data: TemplateData;
};

export type ClaimAsset = PhotoAsset | RenderAsset;

/** Public URL for an asset — derived, never hand-written. */
export function urlFor(claimNumber: string, file: string) {
  return `/demo/claims/${claimNumber.toLowerCase()}/${file}`;
}

/** Relative output directory for a claim's assets. */
export function dirFor(claimNumber: string) {
  return `public/demo/claims/${claimNumber.toLowerCase()}`;
}

// Shared photographic direction. Claim photos are taken by a customer or an
// adjuster on a phone — plain, slightly awkward, well-lit enough to document
// damage. Anything that would render as text is explicitly excluded.
const PHOTO_STYLE =
  "Photorealistic amateur smartphone photo taken to document damage for a vehicle " +
  "insurance claim. Natural available light, mild handheld tilt, ordinary everyday " +
  "background, shallow but realistic depth of field, slight sensor noise. " +
  "No people, no text, no logos, no badges, no license plate numbers, no watermarks, " +
  "no captions or overlays. Documentary, not advertising — unglamorous and honest.";

function photoPrompt(subject: string) {
  return `${subject} ${PHOTO_STYLE}`;
}

// ------------------------------------------------------------------ issuers

const BAYVIEW = {
  name: "Bayview Collision Center",
  contact: "1140 Bryant St, San Francisco, CA 94103 · (415) 555-0110",
};
const CLEARVIEW = {
  name: "ClearView Auto Glass",
  contact: "3320 Geary Blvd, San Francisco, CA 94118 · (415) 555-0164",
  band: "#123a5c",
  accent: "#7dd3fc",
};
const STERLING = {
  name: "Sterling Auto Insurance",
  contact: "Claims Service Center · PO Box 4120, Columbus, OH 43216 · (800) 555-0199",
  band: "#0f2a1d",
  accent: "#86efac",
};
const SFPD = {
  name: "San Francisco Police Department",
  contact: "Traffic Company · 1595 Evans Ave, San Francisco, CA 94124 · (415) 555-0100",
  band: "#132a4a",
  accent: "#cbd5e1",
};
const CASCADE = {
  name: "Cascade Dent & Paint",
  contact: "14210 NE 20th St, Bellevue, WA 98007 · (425) 555-0121",
  band: "#1f2937",
  accent: "#fbbf24",
};
const METEOROLOGY = {
  name: "Northwest Storm Analytics",
  contact: "Certified weather verification · 700 5th Ave, Seattle, WA 98104",
  band: "#2b1d4a",
  accent: "#c4b5fd",
};
const WASATCH = {
  name: "Wasatch Fleet Body Works",
  contact: "1180 S Redwood Rd, Salt Lake City, UT 84104 · (801) 555-0143",
  band: "#26221c",
  accent: "#f0b323",
};
const PINNACLE = {
  name: "Pinnacle Delivery Services LLC",
  contact: "2850 Commerce Pkwy, Suite 120, Salt Lake City, UT 84117 · (801) 555-0188",
  band: "#1b2f3a",
  accent: "#7dd3fc",
};
const WILLAMETTE_TOW = {
  name: "Willamette Towing & Recovery",
  contact: "4455 SE Tualatin Valley Hwy, Hillsboro, OR 97123 · (503) 555-0177",
  band: "#3b1f1f",
  accent: "#fca5a5",
};
const ROSE_CITY = {
  name: "Rose City Auto Body",
  contact: "2110 NE Cornell Rd, Hillsboro, OR 97124 · (503) 555-0152",
  band: "#1c2b24",
  accent: "#a7f3d0",
};

// ------------------------------------------------------------------- assets

export const CLAIM_ASSETS: Record<string, ClaimAsset[]> = {
  // Alex Morgan · 2022 Toyota RAV4 XLE · comprehensive glass · APPROVED
  "STER-CLM-2026-0001": [
    {
      source: "ai",
      kind: "photo",
      file: "windshield.jpg",
      title: "Windshield — impact star & crack",
      docDate: "2026-05-12",
      prompt: photoPrompt(
        "Close-up of a chipped car windshield seen from inside the parked car: a " +
          "bullseye impact star on the passenger side with a long crack running " +
          "toward the A-pillar, dashboard and steering wheel blurred in the " +
          "foreground, grey overcast sky and a suburban street through the glass."
      ),
    },
    {
      source: "render",
      kind: "document",
      file: "glass-invoice.png",
      title: "Glass replacement invoice — ClearView",
      docDate: "2026-06-24",
      data: {
        template: "lineItem",
        issuer: CLEARVIEW,
        docLabel: "Invoice",
        refNumber: "CVG-26-88231",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0001", mono: true },
          { label: "Vehicle", value: "2022 Toyota RAV4 XLE · 8KQM214" },
          { label: "Invoice date", value: "June 24, 2026" },
          { label: "Date of loss", value: "May 12, 2026" },
        ],
        headers: { item: "Description", qty: "Qty", amount: "Amount" },
        items: [
          { label: "OEM-equivalent windshield, acoustic interlayer", qty: "1", amount: "$ 420.00" },
          { label: "Urethane adhesive kit & primer", qty: "1", amount: "$ 48.00" },
          { label: "Glass removal & installation labour", qty: "2.0", amount: "$ 150.00" },
          { label: "ADAS forward-camera recalibration", qty: "1", amount: "$ 52.00" },
          { label: "Molding & clip set", qty: "1", amount: "$ 10.00" },
        ],
        totals: [
          { label: "Subtotal", amount: "$ 680.00" },
          { label: "Glass deductible (waived)", amount: "$ 0.00" },
          { label: "Net claim", amount: "$ 680.00", strong: true },
        ],
        stamp: { text: "PAID BY INSURER", color: "#15803d" },
        notes: [
          "Mobile installation completed at customer address. 12-month workmanship warranty.",
          "Installer: R. Okafor, AGSC-certified · Work order CVG-WO-4471",
        ],
      },
    },
    {
      source: "render",
      kind: "document",
      file: "remittance-advice.png",
      title: "Remittance advice — payout to ClearView",
      docDate: "2026-07-02",
      data: {
        template: "letter",
        issuer: STERLING,
        docLabel: "Remittance advice",
        refNumber: "STER-RA-2026-0001",
        recipient: [
          "ClearView Auto Glass",
          "3320 Geary Blvd",
          "San Francisco, CA 94118",
        ],
        subject: "Payment scheduled — claim STER-CLM-2026-0001",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0001", mono: true },
          { label: "Policy", value: "STER-AUTO-2026-00100", mono: true },
          { label: "Insured", value: "Alex Morgan" },
          { label: "Payment date", value: "July 2, 2026" },
        ],
        paragraphs: [
          "This claim was approved on June 24, 2026 under the comprehensive glass coverage of the policy above. Payment is being issued directly to your facility for invoice CVG-26-88231; no amount is due from the insured.",
          "Funds are released by ACH to the account on file and typically settle within two business days of the payment date. Retain this advice with the work order for your records.",
        ],
        summary: [
          { label: "Invoice CVG-26-88231", value: "$ 680.00" },
          { label: "Less deductible (glass — waived)", value: "$ 0.00" },
          { label: "Total remitted", value: "$ 680.00", strong: true },
        ],
        signature: { name: "D. Whitfield", title: "Claims Payment Operations, Sterling Auto" },
        notes: ["Questions about this payment: (800) 555-0199, option 3."],
      },
    },
  ],

  // Alex Morgan · 2022 Toyota RAV4 XLE · collision · IN REVIEW
  "STER-CLM-2026-0002": [
    {
      source: "ai",
      kind: "photo",
      file: "rear-bumper.jpg",
      title: "Rear bumper — impact damage",
      docDate: "2026-06-18",
      prompt: photoPrompt(
        "Rear bumper of a silver 2022 compact SUV after being rear-ended: the " +
          "plastic bumper cover is cracked and pushed in on the driver side with " +
          "scuffed paint and a visible gap where it has separated from the body, " +
          "photographed from a low crouching angle on a city street at dusk."
      ),
    },
    {
      source: "ai",
      kind: "photo",
      file: "tailgate.jpg",
      title: "Tailgate — dent & paint scrape",
      docDate: "2026-06-18",
      prompt: photoPrompt(
        "Rear tailgate of a silver compact SUV with a shallow horizontal dent " +
          "across the lower panel and a long grey paint transfer scrape, " +
          "photographed straight on from about two metres away on a city street."
      ),
    },
    {
      source: "ai",
      kind: "photo",
      file: "scene.jpg",
      title: "Scene — intersection after impact",
      docDate: "2026-06-18",
      prompt: photoPrompt(
        "Wide shot of two cars stopped in the right lane at a city intersection " +
          "after a low-speed rear-end collision at dusk, hazard lights on, the " +
          "rear car pulled up close behind the front one, wet asphalt reflecting " +
          "traffic lights and shopfronts."
      ),
    },
    {
      source: "render",
      kind: "photo",
      file: "vin-plate.png",
      title: "VIN plate — driver door jamb",
      docDate: "2026-06-18",
      data: {
        template: "vinPlate",
        vin: "2T3W1RFV5NW123456",
        plate: "8KQM214",
        year: 2022,
        make: "Toyota",
        model: "RAV4 XLE",
        gvwr: "2,130 KG",
        paintCode: "1J9 / FB15",
        plant: "NW / KY-3",
      },
    },
    {
      source: "render",
      kind: "document",
      file: "police-report.png",
      title: "Police report — SFPD-2026-114872",
      docDate: "2026-06-19",
      data: {
        template: "form",
        issuer: SFPD,
        docLabel: "Traffic collision report",
        formTitle: "Traffic collision report — non-injury · CHP 555 short form",
        refNumber: "SFPD-2026-114872",
        fields: [
          { label: "Report number", value: "SFPD-2026-114872", mono: true },
          { label: "Date / time of collision", value: "June 18, 2026 · 18:42" },
          { label: "Location", value: "16th St & Potrero Ave, San Francisco" },
          { label: "Reporting officer", value: "Ofc. R. Delgado #2287" },
          { label: "Party 1 (struck)", value: "2022 Toyota RAV4 · 8KQM214" },
          { label: "Party 2 (striking)", value: "2019 Honda Civic · 6WRT903" },
        ],
        checkboxes: [
          { label: "Injuries reported", checked: false },
          { label: "Tow required", checked: false },
          { label: "Citation issued", checked: true },
          { label: "Both parties insured", checked: true },
          { label: "Hazmat involved", checked: false },
          { label: "Photos taken on scene", checked: true },
        ],
        narrative: {
          heading: "Officer narrative",
          body:
            "P-1 was stopped in the number two lane for a red signal at 16th St and Potrero Ave. " +
            "P-2, travelling in the same direction and lane, failed to stop and struck the rear of " +
            "P-1 at low speed. P-2's driver stated they were distracted by traffic merging from " +
            "the right and did not see P-1 stop. Damage to P-1 is confined to the rear bumper " +
            "cover, bumper reinforcement and lower tailgate. Damage to P-2 is confined to the " +
            "front bumper cover and licence plate bracket. Both vehicles were driveable and were " +
            "moved to the curb lane. No injuries were reported by either party at the scene. P-2 " +
            "was cited under CVC 22350. Insurance information was exchanged in my presence.",
        },
        signature: { name: "R. Delgado", title: "Officer #2287 · SFPD Traffic Company" },
        notes: ["Certified copy released to the insured on June 19, 2026."],
      },
    },
    {
      source: "render",
      kind: "document",
      file: "repair-estimate.png",
      title: "Repair estimate — Bayview Collision Center",
      docDate: "2026-06-21",
      data: {
        template: "lineItem",
        issuer: BAYVIEW,
        docLabel: "Estimate",
        refNumber: "BVC-26-4471",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0002", mono: true },
          { label: "Vehicle", value: "2022 Toyota RAV4 XLE · 8KQM214" },
          { label: "Estimate date", value: "June 21, 2026" },
          { label: "Date of loss", value: "June 18, 2026" },
        ],
        items: [
          { label: "Rear bumper cover — replace", qty: "2.4", amount: "$ 780.00" },
          { label: "Bumper reinforcement bar — replace", qty: "1.6", amount: "$ 465.00" },
          { label: "Tailgate panel — repair & align", qty: "4.2", amount: "$ 910.00" },
          { label: "Refinish tailgate & bumper", qty: "3.5", amount: "$ 640.00" },
          { label: "Blend adjacent quarter panels", qty: "1.8", amount: "$ 325.00" },
          { label: "Parking sensor — recalibrate", qty: "0.8", amount: "$ 180.00" },
          { label: "Paint materials & shop supplies", amount: "$ 100.00" },
        ],
        totals: [
          { label: "Subtotal", amount: "$ 3,400.00" },
          { label: "Deductible", amount: "$ 500.00" },
          { label: "Net claim", amount: "$ 2,900.00", strong: true },
        ],
        stamp: { text: "PENDING REVIEW" },
        notes: [
          "Estimate valid 30 days. Supplements may apply once teardown is complete.",
          "Prepared by: M. Alvarez, Estimator · Shop ref BVC-26-4471",
        ],
      },
    },
  ],

  // Alex Morgan · 2022 Toyota RAV4 XLE · collision · DENIED (no coverage in force)
  "STER-CLM-2026-0003": [
    {
      source: "ai",
      kind: "photo",
      file: "front-quarter.jpg",
      title: "Front quarter panel — guardrail contact",
      docDate: "2026-01-10",
      prompt: photoPrompt(
        "Front passenger-side corner of a silver compact SUV scraped along a " +
          "highway guardrail: crushed and creased front quarter panel, cracked " +
          "bumper corner, long silver-grey abrasion marks through the paint, " +
          "photographed on a cold overcast winter morning on a highway shoulder."
      ),
    },
    {
      source: "render",
      kind: "document",
      file: "denial-letter.png",
      title: "Coverage determination — claim denied",
      docDate: "2026-01-22",
      data: {
        template: "letter",
        issuer: STERLING,
        docLabel: "Coverage determination",
        refNumber: "STER-CD-2026-0003",
        recipient: ["Alex Morgan", "1847 Larkin St, Apt 4", "San Francisco, CA 94109"],
        subject: "Coverage determination — claim STER-CLM-2026-0003 is denied",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0003", mono: true },
          { label: "Policy", value: "STER-AUTO-2026-00100", mono: true },
          { label: "Date of loss", value: "January 10, 2026" },
          { label: "Amount claimed", value: "$ 2,850.00" },
        ],
        paragraphs: [
          "We have completed our review of the single-vehicle collision you reported on January 12, 2026, involving contact with a guardrail on January 10, 2026. We are unable to provide coverage for this loss.",
          "Policy STER-AUTO-2026-00100 took effect on February 1, 2026. The date of loss precedes the inception of the policy, so no collision coverage was in force at the time of the incident. This determination is based on the policy period stated on the declarations page and is not a finding about how the incident occurred or about fault.",
          "If you held coverage with another carrier on January 10, 2026, that carrier should be contacted directly. If you believe the date of loss or the policy period recorded here is incorrect, you may request a review within 60 days of this letter by contacting the claims service center with any supporting documentation.",
        ],
        signature: { name: "K. Ramaswamy", title: "Senior Claims Examiner, Sterling Auto" },
        stamp: { text: "DENIED", color: "#b91c1c" },
        notes: [
          "You may contact your state department of insurance if you disagree with this determination.",
        ],
      },
    },
  ],

  // James Carter · 2023 BMW X5 xDrive40i · hail · APPROVED & PAID
  "STER-CLM-2026-0010": [
    {
      source: "ai",
      kind: "photo",
      file: "hood-hail.jpg",
      title: "Hood — hail dimpling",
      docDate: "2026-04-02",
      prompt: photoPrompt(
        "Hail-dented hood of a dark blue luxury SUV photographed at a low raking " +
          "angle so dozens of shallow round dimples catch the light across the " +
          "sheet metal, a few melting hailstones still lying on the surface, " +
          "grey storm sky and wet suburban driveway."
      ),
    },
    {
      source: "ai",
      kind: "photo",
      file: "roof-hail.jpg",
      title: "Roof — hail dimpling",
      docDate: "2026-04-02",
      prompt: photoPrompt(
        "Roof panel of a dark blue luxury SUV covered in shallow hail dents, " +
          "photographed from above while standing beside the open driver door, " +
          "the dimples visible as a field of soft circular depressions in the wet " +
          "paint, overcast light after a storm."
      ),
    },
    {
      source: "render",
      kind: "document",
      file: "storm-verification.png",
      title: "Storm verification report — April 2 hail",
      docDate: "2026-04-08",
      data: {
        template: "letter",
        issuer: METEOROLOGY,
        docLabel: "Weather verification",
        refNumber: "NWSA-26-30188",
        recipient: [
          "Sterling Auto Insurance — Claims",
          "Attn: Comprehensive unit",
          "PO Box 4120, Columbus, OH 43216",
        ],
        subject: "Hail verification for 455 Lakeview Dr, Bellevue, WA — April 2, 2026",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0010", mono: true },
          { label: "Loss location", value: "455 Lakeview Dr, Bellevue, WA 98004" },
          { label: "Event date", value: "April 2, 2026" },
          { label: "Report issued", value: "April 8, 2026" },
        ],
        paragraphs: [
          "Radar reflectivity, dual-polarisation hail signatures and ground spotter reports were reviewed for a 3 km radius around the loss location for the 24-hour period beginning 00:00 local on April 2, 2026.",
          "A severe thunderstorm cell tracked northeast across the Bellevue area between 15:10 and 15:48 local. Maximum estimated hail size within 1 km of the loss location was 32 mm (1.25 in), with an estimated 11 minutes of continuous hail fall and peak wind gusts of 74 km/h. Two independent spotter reports of quarter-size hail were logged within 2.4 km.",
          "In our opinion the reported hail damage is consistent in size, orientation and severity with the verified event on the stated date.",
        ],
        summary: [
          { label: "Max estimated hail size", value: "32 mm (1.25 in)" },
          { label: "Duration of hail fall", value: "≈ 11 minutes" },
          { label: "Peak gust", value: "74 km/h" },
          { label: "Verification result", value: "CONFIRMED", strong: true },
        ],
        signature: { name: "H. Lindqvist", title: "Certified Consulting Meteorologist, NWSA" },
      },
    },
    {
      source: "render",
      kind: "document",
      file: "pdr-estimate.png",
      title: "Paintless dent repair estimate — Cascade",
      docDate: "2026-04-14",
      data: {
        template: "lineItem",
        issuer: CASCADE,
        docLabel: "Estimate",
        refNumber: "CDP-26-9042",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0010", mono: true },
          { label: "Vehicle", value: "2023 BMW X5 xDrive40i · BMW7X5" },
          { label: "Estimate date", value: "April 14, 2026" },
          { label: "Date of loss", value: "April 2, 2026" },
        ],
        items: [
          { label: "PDR — hood, 60+ dents, heavy density", qty: "9.0", amount: "$ 1,240.00" },
          { label: "PDR — roof panel, 40+ dents", qty: "7.5", amount: "$ 980.00" },
          { label: "PDR — both quarter panels", qty: "5.0", amount: "$ 640.00" },
          { label: "Sunroof glass — replace (cracked)", qty: "2.5", amount: "$ 720.00" },
          { label: "Headliner R&I for roof access", qty: "3.0", amount: "$ 340.00" },
          { label: "Roof rail trim — replace", qty: "1.0", amount: "$ 130.00" },
          { label: "Materials & shop supplies", amount: "$ 70.00" },
        ],
        totals: [
          { label: "Subtotal", amount: "$ 4,120.00" },
          { label: "Deductible", amount: "$ 1,000.00" },
          { label: "Net claim", amount: "$ 3,120.00", strong: true },
        ],
        stamp: { text: "APPROVED", color: "#15803d" },
        notes: [
          "Paintless repair preserves factory finish; no refinish operations required.",
          "Prepared by: T. Novak, PDR Technician · Shop ref CDP-26-9042",
        ],
      },
    },
    {
      source: "render",
      kind: "document",
      file: "remittance-advice.png",
      title: "Remittance advice — payout issued",
      docDate: "2026-05-06",
      data: {
        template: "letter",
        issuer: STERLING,
        docLabel: "Remittance advice",
        refNumber: "STER-RA-2026-0010",
        recipient: ["James Carter", "455 Lakeview Dr", "Bellevue, WA 98004"],
        subject: "Payment issued — claim STER-CLM-2026-0010",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0010", mono: true },
          { label: "Policy", value: "STER-AUTO-2026-00337", mono: true },
          { label: "Resolved", value: "April 29, 2026" },
          { label: "Payment date", value: "May 6, 2026" },
        ],
        paragraphs: [
          "Your comprehensive claim for hail damage sustained on April 2, 2026 has been approved. Payment has been issued to the account ending 4417 on file for policy STER-AUTO-2026-00337.",
          "The amount below reflects the approved paintless dent repair estimate from Cascade Dent & Paint (ref CDP-26-9042), less the $1,000 comprehensive deductible stated on your declarations page. If the repairer identifies additional storm-related damage during the repair, a supplement may be submitted for review at no additional deductible.",
        ],
        summary: [
          { label: "Approved repair cost", value: "$ 4,120.00" },
          { label: "Less comprehensive deductible", value: "$ 1,000.00" },
          { label: "Total paid", value: "$ 3,120.00", strong: true },
        ],
        signature: { name: "D. Whitfield", title: "Claims Payment Operations, Sterling Auto" },
        stamp: { text: "PAID", color: "#15803d" },
      },
    },
  ],

  // Pinnacle Delivery Services · 2022 Ford Transit 250 (PDS1002) · collision · IN REVIEW
  "STER-CLM-2026-0021": [
    {
      source: "ai",
      kind: "photo",
      file: "rear-door.jpg",
      title: "Rear cargo door — bollard impact",
      docDate: "2026-06-09",
      prompt: photoPrompt(
        "Rear cargo doors of a plain white delivery van with a deep vertical " +
          "crease and buckled sheet metal on the lower left door where it backed " +
          "into a post, the door edge no longer flush, photographed in a concrete " +
          "warehouse loading area under flat daylight."
      ),
    },
    {
      source: "ai",
      kind: "photo",
      file: "dock-bollard.jpg",
      title: "Loading dock — bollard & scuff marks",
      docDate: "2026-06-09",
      prompt: photoPrompt(
        "A yellow-painted steel safety bollard at the edge of a concrete loading " +
          "dock with fresh white paint transfer and scuff marks on it, a white " +
          "delivery van parked a few metres away in the background, industrial " +
          "warehouse setting, flat overcast daylight."
      ),
    },
    {
      source: "render",
      kind: "document",
      file: "incident-report.png",
      title: "Driver incident report — unit PDS1002",
      docDate: "2026-06-10",
      data: {
        template: "form",
        issuer: PINNACLE,
        docLabel: "Fleet incident report",
        formTitle: "Driver incident report — property damage, no third party",
        refNumber: "PDS-IR-26-0619",
        fields: [
          { label: "Unit", value: "PDS1002 · 2022 Ford Transit 250", mono: false },
          { label: "VIN", value: "1FTBW2CM5NKA10022", mono: true },
          { label: "Date / time", value: "June 9, 2026 · 07:25" },
          { label: "Location", value: "Dock 4, 2850 Commerce Pkwy, Salt Lake City" },
          { label: "Driver", value: "L. Ferreira · CDL UT-448192" },
          { label: "Supervisor notified", value: "June 9, 2026 · 07:40" },
        ],
        checkboxes: [
          { label: "Third party involved", checked: false },
          { label: "Injuries", checked: false },
          { label: "Police notified", checked: false },
          { label: "Vehicle driveable", checked: true },
          { label: "Load secured / undamaged", checked: true },
          { label: "Post-incident test done", checked: true },
        ],
        narrative: {
          heading: "Driver statement",
          body:
            "I was reversing unit PDS1002 into dock 4 to load the morning route. The dock guide " +
            "line was partly worn and I misjudged the offset while checking the passenger mirror. " +
            "The lower left rear door contacted the yellow safety bollard at the edge of the dock " +
            "at low speed. I stopped immediately, pulled forward and inspected the vehicle with " +
            "the dock supervisor. The rear door is creased and no longer closes flush, but it " +
            "latches and the vehicle is driveable. No other vehicle, property or person was " +
            "involved and no load was damaged. Photographs of the door and the bollard were taken " +
            "at the scene and attached to this report.",
        },
        signature: { name: "L. Ferreira", title: "Driver · Pinnacle Delivery Services LLC" },
        notes: ["Reviewed by: A. Whitmore, Fleet Safety Manager · June 10, 2026"],
      },
    },
    {
      source: "render",
      kind: "document",
      file: "body-shop-estimate.png",
      title: "Body shop estimate — Wasatch Fleet",
      docDate: "2026-06-15",
      data: {
        template: "lineItem",
        issuer: WASATCH,
        docLabel: "Estimate",
        refNumber: "WFB-26-2277",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0021", mono: true },
          { label: "Vehicle", value: "2022 Ford Transit 250 · PDS1002" },
          { label: "Estimate date", value: "June 15, 2026" },
          { label: "Date of loss", value: "June 9, 2026" },
        ],
        items: [
          { label: "Rear cargo door, LH — replace", qty: "3.5", amount: "$ 860.00" },
          { label: "Door hinge set & check strap — replace", qty: "1.2", amount: "$ 245.00" },
          { label: "Rear opening frame — straighten & align", qty: "2.6", amount: "$ 420.00" },
          { label: "Refinish door, single stage white", qty: "2.8", amount: "$ 385.00" },
          { label: "Weather seal — replace", qty: "0.5", amount: "$ 95.00" },
          { label: "Materials & shop supplies", amount: "$ 95.00" },
        ],
        totals: [
          { label: "Subtotal", amount: "$ 2,100.00" },
          { label: "Fleet deductible", amount: "$ 2,500.00" },
          { label: "Net claim", amount: "$ 0.00", strong: true },
        ],
        stamp: { text: "PENDING REVIEW" },
        notes: [
          "Estimate falls below the fleet deductible; held for supplement review after teardown.",
          "Prepared by: J. Beltran, Estimator · Shop ref WFB-26-2277",
        ],
      },
    },
  ],

  // Robert & Linda Thompson · 2022 Chevrolet Traverse LT · falling branch · APPROVED
  "STER-CLM-2026-0030": [
    {
      source: "ai",
      kind: "photo",
      file: "branch-on-roof.jpg",
      title: "Fallen branch across the vehicle",
      docDate: "2026-05-28",
      prompt: photoPrompt(
        "A large broken tree limb lying across the roof and windscreen of a dark " +
          "grey family SUV parked in a suburban driveway after a windstorm, leaves " +
          "and smaller branches scattered over the bonnet and the wet driveway, " +
          "grey blustery afternoon light."
      ),
    },
    {
      source: "ai",
      kind: "photo",
      file: "roof-damage.jpg",
      title: "Roof & windshield — impact damage",
      docDate: "2026-05-28",
      prompt: photoPrompt(
        "Close view of the roof rail and upper windscreen of a dark grey family " +
          "SUV after a heavy branch fell on it: a dented and creased roof edge, a " +
          "spidered crack spreading across the top of the windscreen, bark debris " +
          "and small twigs caught in the wiper cowl, overcast daylight."
      ),
    },
    {
      source: "render",
      kind: "document",
      file: "tow-receipt.png",
      title: "Tow receipt — Willamette Towing",
      docDate: "2026-05-28",
      data: {
        template: "lineItem",
        issuer: WILLAMETTE_TOW,
        docLabel: "Receipt",
        refNumber: "WTR-26-51106",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0030", mono: true },
          { label: "Vehicle", value: "2022 Chevrolet Traverse LT · THM4421" },
          { label: "Service date", value: "May 28, 2026" },
          { label: "From / to", value: "8820 Maple Ridge Ln → Rose City Auto Body" },
        ],
        headers: { item: "Service", qty: "Units", amount: "Amount" },
        items: [
          { label: "Flatbed hook-up, non-driveable recovery", qty: "1", amount: "$ 125.00" },
          { label: "Mileage, 11.4 mi @ $6.00", qty: "11.4", amount: "$ 68.00" },
          { label: "Debris clearance & winch-on labour", qty: "0.5", amount: "$ 60.00" },
          { label: "After-hours dispatch surcharge", qty: "1", amount: "$ 32.00" },
        ],
        totals: [
          { label: "Total", amount: "$ 285.00" },
          { label: "Paid by insured (reimbursable)", amount: "$ 285.00", strong: true },
        ],
        stamp: { text: "PAID", color: "#15803d" },
        notes: [
          "Reimbursable under comprehensive coverage. Retain for claim submission.",
          "Operator: C. Mendes · Truck 7 · Dispatch 19:52",
        ],
      },
    },
    {
      source: "render",
      kind: "document",
      file: "repair-estimate.png",
      title: "Repair estimate — Rose City Auto Body",
      docDate: "2026-06-04",
      data: {
        template: "lineItem",
        issuer: ROSE_CITY,
        docLabel: "Estimate",
        refNumber: "RCA-26-7731",
        fields: [
          { label: "Claim", value: "STER-CLM-2026-0030", mono: true },
          { label: "Vehicle", value: "2022 Chevrolet Traverse LT · THM4421" },
          { label: "Estimate date", value: "June 4, 2026" },
          { label: "Date of loss", value: "May 28, 2026" },
        ],
        items: [
          { label: "Windshield — replace, incl. rain sensor", qty: "2.0", amount: "$ 520.00" },
          { label: "Roof panel — repair & align, 2 creases", qty: "4.5", amount: "$ 610.00" },
          { label: "Roof rail moulding LH — replace", qty: "0.8", amount: "$ 165.00" },
          { label: "Refinish roof & rail, blend", qty: "3.2", amount: "$ 430.00" },
          { label: "Wiper cowl panel — replace", qty: "0.6", amount: "$ 120.00" },
          { label: "Materials & shop supplies", amount: "$ 135.00" },
        ],
        totals: [
          { label: "Subtotal", amount: "$ 1,980.00" },
          { label: "Deductible", amount: "$ 500.00" },
          { label: "Net claim", amount: "$ 1,480.00", strong: true },
        ],
        stamp: { text: "APPROVED", color: "#15803d" },
        notes: [
          "Approved June 22, 2026. Payout scheduled June 30, 2026.",
          "Prepared by: S. Iyer, Estimator · Shop ref RCA-26-7731",
        ],
      },
    },
  ],
};
