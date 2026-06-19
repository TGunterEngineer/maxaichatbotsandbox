import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, verifyWebhook, PRICE_TO_TIER, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("[payments-webhook]", event.type, "env:", env);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object, env);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object, env);
        break;
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      default:
        console.log("[payments-webhook] unhandled:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[payments-webhook] error:", e);
    return new Response(`Webhook error: ${e.message}`, { status: 400 });
  }
});

async function logWarning(source: string, message: string, context: Record<string, any>) {
  console.warn(`[${source}]`, message, context);
  try {
    await supabase.from("error_logs").insert({
      source,
      level: "warning",
      message,
      context,
    });
  } catch (e) {
    console.error("[error_logs] insert failed", e);
  }
}

const VALID_TIERS = new Set(["essential", "growth", "premium", "founder"]);

/**
 * Resolve plan info from Stripe by:
 *   1. Retrieving the Price (for lookup_key + product id)
 *   2. Retrieving the Product to read metadata.plan_tier
 * Falls back to the legacy lookup_key → PRICE_TO_TIER map only if metadata is absent.
 */
async function resolvePlanFromStripe(
  stripePriceId: string,
  env: StripeEnv,
): Promise<{ lookupKey: string | null; planTier: string | null; metadataMissing: boolean }> {
  try {
    const stripe = createStripeClient(env);
    const price = await stripe.prices.retrieve(stripePriceId, { expand: ["product"] });
    const lookupKey = (price.lookup_key as string) || null;

    const product: any =
      typeof price.product === "string"
        ? await stripe.products.retrieve(price.product)
        : price.product;

    const metaTier = (product?.metadata?.plan_tier ?? "").toString().trim().toLowerCase();
    if (metaTier && VALID_TIERS.has(metaTier)) {
      return { lookupKey, planTier: metaTier, metadataMissing: false };
    }

    // Legacy fallback: derive tier from lookup_key
    const fallback = lookupKey ? PRICE_TO_TIER[lookupKey] ?? null : null;
    return { lookupKey, planTier: fallback, metadataMissing: !metaTier };
  } catch (e) {
    console.error("Failed to retrieve price/product:", e);
    return { lookupKey: null, planTier: null, metadataMissing: true };
  }
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const orgId = subscription.metadata?.organization_id;
  const userId = subscription.metadata?.user_id;
  if (!orgId || !userId) {
    console.error("Missing org/user metadata on subscription", subscription.id);
    return;
  }

  // Find the recurring price line (skip one-time setup fee)
  const items = subscription.items?.data ?? [];
  const recurringItem = items.find((i: any) => i?.price?.recurring) ?? items[0];
  const stripePriceId = recurringItem?.price?.id;
  const { lookupKey, planTier, metadataMissing } = stripePriceId
    ? await resolvePlanFromStripe(stripePriceId, env)
    : { lookupKey: null, planTier: null, metadataMissing: true };

  if (metadataMissing || !planTier) {
    await logWarning(
      "payments-webhook",
      "Stripe product is missing metadata.plan_tier — defaulting org to inactive",
      {
        subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        organization_id: orgId,
        stripe_price_id: stripePriceId,
        lookup_key: lookupKey,
        env,
      },
    );
  }

  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  // Map Stripe status → our plan_status
  // active/trialing => active, past_due/unpaid => past_due,
  // canceled/incomplete_expired => canceled, missing metadata => inactive (revoke access)
  let planStatus = "active";
  if (["past_due", "unpaid"].includes(subscription.status)) planStatus = "past_due";
  else if (["canceled", "incomplete_expired"].includes(subscription.status)) planStatus = "canceled";

  // Safety fallback: no resolvable tier means we cannot grant access.
  if (!planTier && planStatus === "active") {
    planStatus = "inactive";
  }

  // Upsert subscription row
  await supabase.from("subscriptions").upsert(
    {
      organization_id: orgId,
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      stripe_price_id: lookupKey,
      plan_tier: planTier ?? "growth",
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  // Sync organization by stripe_customer_id (per spec) and by id as a safety net.
  const orgUpdate: Record<string, any> = { plan_status: planStatus };
  // Cancel-at-period-end: keep them on the plan until period ends — DON'T downgrade yet
  if (planTier && planStatus !== "canceled" && planStatus !== "inactive") {
    orgUpdate.plan_tier = planTier;
  }
  await supabase.from("organizations").update(orgUpdate).eq("id", orgId);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const orgId = subscription.metadata?.organization_id;

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  // Mark org as canceled — keep the last paid tier on record but flag access as canceled
  if (orgId) {
    await supabase
      .from("organizations")
      .update({ plan_status: "canceled" })
      .eq("id", orgId);
  }
}

async function handlePaymentFailed(invoice: any, env: StripeEnv) {
  const subId = invoice.subscription;
  if (!subId) return;
  // Mark org as past_due but DON'T downgrade tier (grace period — bot keeps working)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();
  if (sub?.organization_id) {
    await supabase
      .from("organizations")
      .update({ plan_status: "past_due" })
      .eq("id", sub.organization_id);
  }
}

async function handlePaymentSucceeded(invoice: any, env: StripeEnv) {
  const subId = invoice.subscription;
  if (!subId) return;
  // Restore to active if it was past_due
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();
  if (sub?.organization_id) {
    await supabase
      .from("organizations")
      .update({ plan_status: "active" })
      .eq("id", sub.organization_id);
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  // Only handle conversation top-ups; subscription sessions are handled via subscription.* events
  if (session?.metadata?.type !== "conversation_topup") return;
  if (session?.payment_status !== "paid") return;

  const orgId = session.metadata.organization_id;
  const amount = parseInt(session.metadata.topup_amount ?? "0", 10);
  if (!orgId || !amount || amount <= 0) {
    console.error("[topup] missing/invalid metadata", session.id, session.metadata);
    return;
  }

  const { error } = await supabase.rpc("grant_conversation_topup", {
    _org_id: orgId,
    _amount: amount,
  });
  if (error) {
    console.error("[topup] grant failed", session.id, error);
  } else {
    console.log("[topup] granted", amount, "to org", orgId, "session", session.id);
  }
}
