"use client";

import { Car, ChevronRight, LogOut, MessageCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { policyTypeLabel } from "@/lib/pas/policy-view";
import type { AppClaim, AppCustomerData } from "@/components/app/types";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  "comprehensive-glass": "Windshield / glass",
  comprehensive: "Comprehensive",
  collision: "Collision",
};

function claimTypeLabel(type: string): string {
  return (
    CLAIM_TYPE_LABELS[type] ??
    type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

function claimStatus(c: AppClaim): { label: string; className: string } {
  if (c.status === "approved" && c.paymentStatus === "paid")
    return { label: "Paid", className: "border-transparent bg-emerald-600 text-white" };
  if (c.status === "approved")
    return { label: "Approved", className: "border-transparent bg-emerald-600 text-white" };
  if (c.status === "in_review" || c.status === "open")
    return { label: "In review", className: "border-transparent bg-amber-500 text-white" };
  if (c.status === "denied")
    return { label: "Denied", className: "border-transparent bg-red-600 text-white" };
  return { label: c.status, className: "border-rule bg-secondary text-ink" };
}

export function MobileHome({
  data,
  firstName,
  isAuthenticated,
  signInPending,
  onOpenAssistant,
  onOpenSignIn,
  onSignInDemo,
  onSignOut,
}: {
  data: AppCustomerData | null;
  firstName: string | null;
  isAuthenticated: boolean;
  signInPending: boolean;
  onOpenAssistant: () => void;
  onOpenSignIn: () => void;
  onSignInDemo: () => void;
  onSignOut: () => void;
}) {
  const policy = data?.policies[0];
  const vehicle = policy?.vehicles[0];
  const last4 = policy ? policy.policyNumber.slice(-4) : "";
  const claims = policy?.claims ?? [];

  const fullName = data
    ? `${data.customer.firstName} ${data.customer.lastName}`
    : firstName ?? "Account";
  const initials = (
    data
      ? data.customer.firstName.charAt(0) + data.customer.lastName.charAt(0)
      : firstName?.charAt(0) ?? "U"
  ).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-secondary/40">
      {/* App header */}
      <header className="flex items-center justify-between px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink font-display text-sm text-paper">
            S
          </span>
          <span className="font-display text-[17px] text-ink">Sterling</span>
        </div>
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account"
              className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[12px] font-medium text-paper"
            >
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-[13px] text-ink">{fullName}</span>
                  {data && (
                    <span className="text-[12px] font-normal text-muted-foreground">
                      {data.customer.email}
                    </span>
                  )}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="label-eyebrow text-muted-foreground">Auto</span>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {isAuthenticated ? `Hi, ${firstName ?? "there"}` : "Welcome"}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {isAuthenticated
              ? "Here's a snapshot of your auto policy."
              : "Sign in to see your policy and claims."}
          </p>
        </div>

        {/* Signed-out CTA */}
        {!isAuthenticated && (
          <div className="rounded-2xl border border-rule bg-card p-5">
            <p className="text-[13.5px] text-ink">
              Access your policy, vehicles, claims, and payments.
            </p>
            <Button className="mt-3 w-full rounded-xl" onClick={onOpenSignIn}>
              Sign in
            </Button>
            <Button
              variant="outline"
              className="mt-2 w-full rounded-xl"
              onClick={onSignInDemo}
              disabled={signInPending}
            >
              {signInPending ? "Signing in…" : "Sign in as Alex Morgan (demo)"}
            </Button>
          </div>
        )}

        {/* Policy card */}
        {policy && (
          <div className="rounded-2xl bg-ink p-5 text-paper shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="label-eyebrow text-paper/60">
                  {policyTypeLabel(policy.type)}
                </div>
                <div className="mt-1 font-display text-xl tracking-wide">
                  •••• {last4}
                </div>
              </div>
              <Badge className="border-transparent bg-paper/15 text-paper capitalize">
                {policy.status}
              </Badge>
            </div>
            {vehicle && (
              <div className="mt-4 flex items-center gap-2 text-[13px] text-paper/90">
                <Car size={15} />
                <span>
                  {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.plate}
                </span>
              </div>
            )}
            <div className="mt-1 text-[12px] text-paper/60">
              Renews {fmtDate(policy.endDate)}
            </div>
          </div>
        )}

        {/* Claims — minimal list with status */}
        {isAuthenticated && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold text-ink">Your claims</h2>
              <span className="text-[12px] text-muted-foreground">
                {claims.length} total
              </span>
            </div>
            {claims.length === 0 ? (
              <div className="rounded-2xl border border-rule bg-card p-4 text-[13px] text-muted-foreground">
                No claims on file.
              </div>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-rule bg-card">
                {claims.map((c) => {
                  const s = claimStatus(c);
                  return (
                    <li
                      key={c.claimNumber}
                      className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 last:border-b-0"
                    >
                      <span className="truncate text-[13.5px] text-ink">
                        {claimTypeLabel(c.type)}
                      </span>
                      <Badge className={`${s.className} shrink-0`}>
                        {s.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Assistant launcher card */}
        <button
          onClick={onOpenAssistant}
          className="flex w-full items-center gap-3 rounded-2xl border border-ink/15 bg-card p-4 text-left transition-colors hover:bg-secondary/60"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-paper">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-ink">
              Ask the Sterling assistant
            </div>
            <div className="text-[12px] text-muted-foreground">
              Claims, payments, coverage, billing — 24/7
            </div>
          </div>
          <ChevronRight size={16} className="ml-auto text-muted-foreground" />
        </button>
      </div>

      {/* Floating assistant button */}
      <button
        onClick={onOpenAssistant}
        aria-label="Open the Sterling assistant"
        className="absolute bottom-5 right-5 z-10 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle size={22} />
      </button>
    </div>
  );
}
