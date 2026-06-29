import type { getAllCustomersWithSummary } from "@/lib/db/pas";

export type CustomerSummary = Awaited<
  ReturnType<typeof getAllCustomersWithSummary>
>[number];

// Human labels for our policy-type slugs.
const POLICY_TYPE_LABELS: Record<string, string> = {
  "personal-auto": "Personal Auto",
  "commercial-fleet": "Commercial Fleet",
  "rideshare-auto": "Rideshare / Delivery Auto",
  "classic-auto": "Classic & Collector Auto",
  "high-value-auto": "High-Value Auto",
  "small-fleet": "Small Business Fleet",
  "multi-vehicle-package": "Multi-Vehicle Package",
};

export function policyTypeLabel(slug: string): string {
  return (
    POLICY_TYPE_LABELS[slug] ??
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function formatCompactUsd(n: number): string {
  if (n >= 1e9) return `$${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n.toLocaleString()}`;
}

export type PolicyView = {
  id: string;
  name: string;
  kind: "Corporate" | "Individual";
  email: string;
  phone: string | null;
  joined: string; // ISO date
  policyNumber: string | null;
  policyType: string;
  policyCount: number;
  activeCount: number;
  insuredObjects: string[];
  limit: string;
  claims: number;
  openClaims: number;
  premium: number;
  effective: string | null;
  renewal: string | null;
};

// Derive the reference PolicyRow shape from a real customer summary.
export function toPolicyView(c: CustomerSummary): PolicyView {
  const primary = c.policies[0];
  const vehicles = c.policies.flatMap((p) => p.vehicles);
  const allClaims = c.policies.flatMap((p) => p.claims);
  const limits = c.policies.flatMap((p) =>
    p.coverages.map((cv) => Number(cv.limitAmount ?? 0))
  );
  const maxLimit = limits.length ? Math.max(...limits) : 0;

  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`.trim(),
    kind: c.dateOfBirth ? "Individual" : "Corporate",
    email: c.email,
    phone: c.phone,
    joined:
      c.createdAt instanceof Date
        ? c.createdAt.toISOString()
        : String(c.createdAt),
    policyNumber: primary?.policyNumber ?? null,
    policyType: primary ? policyTypeLabel(primary.type) : "—",
    policyCount: c.policies.length,
    activeCount: c.policies.filter((p) => p.status === "active").length,
    insuredObjects: vehicles.map(
      (v) => `${v.year} ${v.make} ${v.model} (${v.plate})`
    ),
    limit: maxLimit ? `${formatCompactUsd(maxLimit)} per accident` : "—",
    claims: allClaims.length,
    openClaims: allClaims.filter((cl) => !cl.dateResolved).length,
    premium: c.policies.reduce((s, p) => s + Number(p.premium ?? 0), 0),
    effective: primary?.startDate ?? null,
    renewal: primary?.endDate ?? null,
  };
}
