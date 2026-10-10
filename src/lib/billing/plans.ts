export type PlanKey = "FREE" | "TEAM" | "BUSINESS" | "ENTERPRISE";
export type BillingInterval = "MONTHLY" | "YEARLY";

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyCents: number;
  yearlyCents: number;
  includedSeats: number;
  extraSeatMonthlyCents: number;
  features: string[];
  limits: {
    projects: number; // -1 = unlimited
    automations: number;
    slaPolicies: number;
    sso: boolean;
    auditLogRetentionDays: number;
    dedicatedCsm: boolean;
    invoiceNetTerms: boolean;
  };
};

export const PLAN_CATALOG: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: "FREE",
    name: "Free",
    tagline: "For small teams evaluating the platform",
    monthlyCents: 0,
    yearlyCents: 0,
    includedSeats: 5,
    extraSeatMonthlyCents: 0,
    features: [
      "Up to 5 seats",
      "3 projects",
      "Core issue tracking",
      "Community support",
    ],
    limits: {
      projects: 3,
      automations: 2,
      slaPolicies: 0,
      sso: false,
      auditLogRetentionDays: 14,
      dedicatedCsm: false,
      invoiceNetTerms: false,
    },
  },
  TEAM: {
    key: "TEAM",
    name: "Team",
    tagline: "For growing engineering organizations",
    monthlyCents: 1200,
    yearlyCents: 12000,
    includedSeats: 10,
    extraSeatMonthlyCents: 800,
    features: [
      "10 included seats",
      "Unlimited projects",
      "Sprints, epics & releases",
      "Email support",
    ],
    limits: {
      projects: -1,
      automations: 20,
      slaPolicies: 3,
      sso: false,
      auditLogRetentionDays: 90,
      dedicatedCsm: false,
      invoiceNetTerms: false,
    },
  },
  BUSINESS: {
    key: "BUSINESS",
    name: "Business",
    tagline: "For multi-team enterprises needing SLAs",
    monthlyCents: 2900,
    yearlyCents: 29000,
    includedSeats: 25,
    extraSeatMonthlyCents: 1200,
    features: [
      "25 included seats",
      "SSO-ready workspace",
      "SLA policies & automations",
      "Priority support",
    ],
    limits: {
      projects: -1,
      automations: -1,
      slaPolicies: -1,
      sso: true,
      auditLogRetentionDays: 365,
      dedicatedCsm: false,
      invoiceNetTerms: true,
    },
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Custom contracts, wire transfer, and net terms",
    monthlyCents: 7900,
    yearlyCents: 79000,
    includedSeats: 50,
    extraSeatMonthlyCents: 1500,
    features: [
      "50 included seats",
      "Invoice / PO / ACH / wire",
      "Dedicated CSM & MSA",
      "Unlimited audit retention",
    ],
    limits: {
      projects: -1,
      automations: -1,
      slaPolicies: -1,
      sso: true,
      auditLogRetentionDays: -1,
      dedicatedCsm: true,
      invoiceNetTerms: true,
    },
  },
};

export function normalizePlanKey(plan: string | null | undefined): PlanKey {
  const upper = (plan || "FREE").toUpperCase();
  if (upper === "PRO") return "TEAM";
  if (upper === "TEAM" || upper === "BUSINESS" || upper === "ENTERPRISE") {
    return upper;
  }
  return "FREE";
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function quotePlan(
  planKey: PlanKey,
  interval: BillingInterval,
  seats: number,
): { subtotalCents: number; extraSeats: number; extraSeatCents: number } {
  const plan = PLAN_CATALOG[planKey];
  const extraSeats = Math.max(0, seats - plan.includedSeats);
  const extraSeatCents =
    extraSeats *
    (interval === "YEARLY"
      ? plan.extraSeatMonthlyCents * 10
      : plan.extraSeatMonthlyCents);
  const base = interval === "YEARLY" ? plan.yearlyCents : plan.monthlyCents;
  return {
    subtotalCents: base + extraSeatCents,
    extraSeats,
    extraSeatCents,
  };
}
