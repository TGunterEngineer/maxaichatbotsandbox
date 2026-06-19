// SINGLE SOURCE OF TRUTH for all pricing.
//
// Imported by frontend pages (Landing, Pricing, Checkout, FounderOfferCard).
// The /super-admin "Sync Stripe Prices" button posts buildPriceSpecs() to the
// sync-stripe-prices edge function, which reconciles Stripe to match.
//
// To change a price: edit this file, then click "Sync Stripe Prices" in
// /super-admin. Stripe gets new prices with the same lookup_key (Stripe
// transfers the key off the old price automatically — no checkout downtime).

export type TierKey = "essential" | "growth" | "premium" | "founder";

export interface TierConfig {
  key: TierKey;
  name: string;
  productId: string;          // Stripe product id (also our internal id)
  monthly: number;            // USD whole dollars
  annualTotal: number | null; // USD/year, null = no annual offering (founder)
  setup: number;              // USD whole dollars (one-time)
}

export const TIERS: Record<TierKey, TierConfig> = {
  essential: {
    key: "essential",
    name: "Essential",
    productId: "essential",
    monthly: 99,
    annualTotal: 999,
    setup: 199,
  },
  growth: {
    key: "growth",
    name: "Growth",
    productId: "growth",
    monthly: 199,
    annualTotal: 1999,
    setup: 399,
  },
  premium: {
    key: "premium",
    name: "Premium",
    productId: "premium",
    monthly: 399,
    annualTotal: 3999,
    setup: 799,
  },
  founder: {
    key: "founder",
    name: "Founding Client",
    productId: "founder",
    monthly: 99,
    annualTotal: null,
    setup: 199,
  },
};

// Display: $X/mo equivalent when billed annually
export const annualMonthly = (annualTotal: number) => Math.round(annualTotal / 12);

export const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

// ---------- Lookup key helpers ----------
// Stripe lookup_keys are stable identifiers used by checkout & SETUP_FOR_TIER
// in supabase/functions/_shared/stripe.ts. growth & premium use *_v2 suffix
// (legacy migration). DO NOT change these without updating stripe.ts mappings.

export function monthlyLookupKey(key: TierKey): string {
  return key === "growth" || key === "premium" ? `${key}_monthly_v2` : `${key}_monthly`;
}

export function annualLookupKey(key: TierKey): string {
  return key === "growth" || key === "premium" ? `${key}_annual_v2` : `${key}_annual`;
}

export function setupLookupKey(key: TierKey): string {
  return `${key}_setup`;
}

// ---------- Stripe sync model ----------

export interface PriceSpec {
  lookupKey: string;
  productId: string;
  productName: string;
  amountCents: number;
  recurringInterval: "month" | "year" | null; // null = one-time setup fee
}

export function buildPriceSpecs(): PriceSpec[] {
  const specs: PriceSpec[] = [];
  for (const tier of Object.values(TIERS)) {
    specs.push({
      lookupKey: monthlyLookupKey(tier.key),
      productId: tier.productId,
      productName: tier.name,
      amountCents: tier.monthly * 100,
      recurringInterval: "month",
    });
    specs.push({
      lookupKey: setupLookupKey(tier.key),
      productId: tier.productId,
      productName: `${tier.name} Setup`,
      amountCents: tier.setup * 100,
      recurringInterval: null,
    });
    if (tier.annualTotal) {
      specs.push({
        lookupKey: annualLookupKey(tier.key),
        productId: tier.productId,
        productName: tier.name,
        amountCents: tier.annualTotal * 100,
        recurringInterval: "year",
      });
    }
  }
  return specs;
}
