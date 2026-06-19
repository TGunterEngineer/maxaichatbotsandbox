import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, createStripeClient, PRICE_TO_TIER } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, newPriceId, environment } = await req.json();

    if (!organizationId || typeof organizationId !== "string") {
      return new Response(JSON.stringify({ error: "organizationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!newPriceId || !/^[a-zA-Z0-9_-]+$/.test(newPriceId) || !(newPriceId in PRICE_TO_TIER)) {
      return new Response(JSON.stringify({ error: "Invalid newPriceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate caller and require owner role on this org
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || membership.role !== "owner") {
      return new Response(JSON.stringify({ error: "Owner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Find the org's current active subscription
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_price_id")
      .eq("organization_id", organizationId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subRow?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve target price (lookup_key -> Stripe price id)
    const prices = await stripe.prices.list({ lookup_keys: [newPriceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Target price not found in Stripe" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetPriceId = prices.data[0].id;

    // Already on this plan?
    if (subRow.stripe_price_id === newPriceId || subRow.stripe_price_id === targetPriceId) {
      return new Response(JSON.stringify({ error: "Already on this plan" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current sub to find item id
    const current = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
    const currentItem = current.items?.data?.[0];
    if (!currentItem) {
      return new Response(JSON.stringify({ error: "Subscription has no items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Swap price with proration. Charges/credits on the next invoice.
    const updated = await stripe.subscriptions.update(subRow.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: targetPriceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
      metadata: {
        ...(current.metadata || {}),
        organization_id: organizationId,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        subscriptionId: updated.id,
        status: updated.status,
        newPriceLookup: newPriceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("change-subscription error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
