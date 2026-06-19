import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, createStripeClient, SETUP_FOR_TIER } from "../_shared/stripe.ts";

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
    // 0. Require auth — prevent unauthenticated callers from creating checkout
    // sessions against arbitrary organization UUIDs (which the webhook would
    // then apply as a plan-tier change on the victim org).
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authedUser = userData.user;

    const { priceId, customerEmail, organizationId, userId, returnUrl, environment } = await req.json();

    // 1. Validate Input
    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller must match the userId they're acting as
    if (userId && userId !== authedUser.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // If an organizationId is supplied, caller must be its owner.
    if (organizationId) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: ownership } = await adminClient
        .from("user_organizations")
        .select("role")
        .eq("user_id", authedUser.id)
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .maybeSingle();
      if (!ownership) {
        return new Response(JSON.stringify({ error: "Forbidden: not an owner of this organization" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Hard cap on founder slots — atomic reservation to prevent race conditions
    // where multiple concurrent checkouts could exceed the 10-spot limit.
    let founderReservationId: string | null = null;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (priceId === "founder_monthly") {
      if (!organizationId) {
        return new Response(JSON.stringify({ error: "organizationId required for founder checkout" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: reserveData, error: reserveError } = await adminClient.rpc("reserve_founder_spot", {
        _org_id: organizationId,
        _user_id: authedUser.id,
        _ttl_minutes: 15,
      });
      if (reserveError) {
        console.error("reserve_founder_spot failed:", reserveError);
        return new Response(JSON.stringify({ error: "Unable to verify founder availability" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const row = Array.isArray(reserveData) ? reserveData[0] : reserveData;
      if (!row?.reserved) {
        return new Response(
          JSON.stringify({
            error: "FOUNDER_SLOTS_FULL",
            message: `All ${row?.total ?? 10} founder spots have been claimed.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      founderReservationId = row.reservation_id;
    }

    // Helper to release the founder reservation if anything below fails.
    const releaseReservation = async () => {
      if (founderReservationId) {
        try {
          await adminClient.rpc("release_founder_spot", { _reservation_id: founderReservationId });
        } catch (e) {
          console.error("release_founder_spot failed:", e);
        }
      }
    };

    try {
      // 2. Resolve Prices
      const subPrices = await stripe.prices.list({ lookup_keys: [priceId] });
      if (!subPrices.data.length) {
        await releaseReservation();
        return new Response(JSON.stringify({ error: "Price not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const subPrice = subPrices.data[0];

      const lineItems: any[] = [{ price: subPrice.id, quantity: 1 }];

      const setupKey = SETUP_FOR_TIER[priceId];
      if (setupKey) {
        const setupPrices = await stripe.prices.list({ lookup_keys: [setupKey] });
        if (setupPrices.data.length) {
          lineItems.push({ price: setupPrices.data[0].id, quantity: 1 });
        }
      }

      // 3. Look up Existing Customer
      let stripeCustomerId: string | undefined;
      if (organizationId) {
        const { data: existing } = await adminClient
          .from("subscriptions")
          .select("stripe_customer_id")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (existing && existing.length > 0) {
          stripeCustomerId = existing[0].stripe_customer_id;
        }
      }

      const metadata: Record<string, string> = {};
      if (organizationId) metadata.organization_id = organizationId;
      if (userId) metadata.user_id = userId;
      if (founderReservationId) metadata.founder_reservation_id = founderReservationId;

      // 4. Create the Checkout Session
      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "subscription",
        ui_mode: "embedded",
        automatic_tax: { enabled: true },
        return_url: returnUrl || `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        ...(stripeCustomerId
          ? { customer: stripeCustomerId, customer_update: { address: "auto", name: "auto" } }
          : customerEmail
          ? { customer_email: customerEmail }
          : {}),
        billing_address_collection: "required",
        allow_promotion_codes: true,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min Stripe-side expiry
        metadata,
        subscription_data: { metadata },
      });

      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (innerErr) {
      // Stripe failed — release the founder reservation so the spot isn't held.
      await releaseReservation();
      throw innerErr;
    }
  } catch (e: any) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: "Unable to create the checkout session. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
