// Environment detection only — does NOT import @stripe/stripe-js.
// Importing @stripe/stripe-js auto-injects js.stripe.com for fraud detection,
// so we keep this module dependency-free for use on non-checkout pages
// (e.g. BillingCard, StripePriceSyncPanel).

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: "sandbox" | "live" =
  clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

export function getStripeEnvironment(): "sandbox" | "live" {
  return environment;
}
