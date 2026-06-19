// Reconciles Stripe prices to match the spec posted by the admin client.
// For each spec entry: ensures the product exists, then either confirms the
// active price already matches, or creates a new price with the same
// lookup_key (Stripe transfers the key off the old price automatically).
//
// Auth: requires a logged-in user with the 'admin' role. Verified server-side
// against public.user_roles via service-role client.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PriceSpec {
  lookupKey: string;
  productId: string;
  productName: string;
  amountCents: number;
  recurringInterval: "month" | "year" | null;
}

interface DiffEntry {
  lookupKey: string;
  productId: string;
  action: "unchanged" | "updated" | "created" | "product_created" | "error";
  oldAmountCents?: number;
  newAmountCents: number;
  message?: string;
}

function isPriceSpec(x: any): x is PriceSpec {
  return (
    x &&
    typeof x.lookupKey === "string" &&
    /^[a-z0-9_]+$/.test(x.lookupKey) &&
    typeof x.productId === "string" &&
    /^[a-z0-9_]+$/.test(x.productId) &&
    typeof x.productName === "string" &&
    x.productName.length > 0 &&
    x.productName.length <= 200 &&
    Number.isInteger(x.amountCents) &&
    x.amountCents > 0 &&
    x.amountCents < 10_000_000 && // $100k cap, sanity check
    (x.recurringInterval === null ||
      x.recurringInterval === "month" ||
      x.recurringInterval === "year")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ---- Auth: admin only ----
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Validate body ----
    const body = await req.json();
    const env = (body.environment === "live" ? "live" : "sandbox") as StripeEnv;
    const dryRun = !!body.dryRun;
    const specs = body.specs;
    if (!Array.isArray(specs) || specs.length === 0 || specs.length > 50) {
      return new Response(JSON.stringify({ error: "specs must be a non-empty array (max 50)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const s of specs) {
      if (!isPriceSpec(s)) {
        return new Response(
          JSON.stringify({ error: "Invalid PriceSpec entry", entry: s }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    // No duplicate lookup keys
    const seen = new Set<string>();
    for (const s of specs as PriceSpec[]) {
      if (seen.has(s.lookupKey)) {
        return new Response(
          JSON.stringify({ error: `Duplicate lookupKey: ${s.lookupKey}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      seen.add(s.lookupKey);
    }

    const stripe = createStripeClient(env);
    const diff: DiffEntry[] = [];

    // Cache product existence checks within this run
    const productCache = new Map<string, boolean>();

    for (const spec of specs as PriceSpec[]) {
      try {
        // 1. Ensure product exists with the right tax code (SaaS)
        const SAAS_TAX_CODE = "txcd_10103001";
        if (!productCache.has(spec.productId)) {
          let existingProduct: any = null;
          try {
            existingProduct = await stripe.products.retrieve(spec.productId);
          } catch (e: any) {
            if (e?.code !== "resource_missing") throw e;
          }
          if (!existingProduct && !dryRun) {
            await stripe.products.create({
              id: spec.productId,
              name: spec.productName,
              tax_code: SAAS_TAX_CODE,
            });
            diff.push({
              lookupKey: `__product__:${spec.productId}`,
              productId: spec.productId,
              action: "product_created",
              newAmountCents: 0,
              message: `Created product '${spec.productId}' (tax_code: ${SAAS_TAX_CODE})`,
            });
          } else if (!existingProduct && dryRun) {
            diff.push({
              lookupKey: `__product__:${spec.productId}`,
              productId: spec.productId,
              action: "product_created",
              newAmountCents: 0,
              message: `[dry-run] Would create product '${spec.productId}' with tax_code ${SAAS_TAX_CODE}`,
            });
          } else if (existingProduct && existingProduct.tax_code !== SAAS_TAX_CODE) {
            if (!dryRun) {
              await stripe.products.update(spec.productId, { tax_code: SAAS_TAX_CODE });
            }
            diff.push({
              lookupKey: `__product__:${spec.productId}`,
              productId: spec.productId,
              action: "product_created",
              newAmountCents: 0,
              message: dryRun
                ? `[dry-run] Would set tax_code ${SAAS_TAX_CODE} on '${spec.productId}'`
                : `Set tax_code ${SAAS_TAX_CODE} on '${spec.productId}'`,
            });
          }
          productCache.set(spec.productId, true);
        }

        // 2. Look up active price by lookup_key
        const existing = await stripe.prices.list({
          lookup_keys: [spec.lookupKey],
          active: true,
          limit: 1,
        });
        const current = existing.data[0];

        // 3. Compare
        if (current) {
          const sameAmount = current.unit_amount === spec.amountCents;
          const sameInterval =
            (spec.recurringInterval === null && !current.recurring) ||
            (spec.recurringInterval !== null &&
              current.recurring?.interval === spec.recurringInterval);
          const sameProduct = current.product === spec.productId;

          if (sameAmount && sameInterval && sameProduct) {
            diff.push({
              lookupKey: spec.lookupKey,
              productId: spec.productId,
              action: "unchanged",
              oldAmountCents: current.unit_amount ?? undefined,
              newAmountCents: spec.amountCents,
            });
            continue;
          }

          if (dryRun) {
            diff.push({
              lookupKey: spec.lookupKey,
              productId: spec.productId,
              action: "updated",
              oldAmountCents: current.unit_amount ?? undefined,
              newAmountCents: spec.amountCents,
              message: "[dry-run] Would create new price + transfer lookup_key",
            });
            continue;
          }

          // Create new price with same lookup_key (Stripe auto-transfers it
          // off the old price and deactivates the old one if we set transfer_lookup_key).
          const newPrice = await stripe.prices.create({
            currency: "usd",
            unit_amount: spec.amountCents,
            product: spec.productId,
            lookup_key: spec.lookupKey,
            transfer_lookup_key: true,
            ...(spec.recurringInterval && {
              recurring: { interval: spec.recurringInterval },
            }),
          });
          // Deactivate old price (lookup_key already moved off it, but archive for cleanliness)
          await stripe.prices.update(current.id, { active: false }).catch(() => {});

          diff.push({
            lookupKey: spec.lookupKey,
            productId: spec.productId,
            action: "updated",
            oldAmountCents: current.unit_amount ?? undefined,
            newAmountCents: spec.amountCents,
            message: `New price ${newPrice.id} (was ${current.id})`,
          });
        } else {
          // No existing price with this lookup_key — create fresh
          if (dryRun) {
            diff.push({
              lookupKey: spec.lookupKey,
              productId: spec.productId,
              action: "created",
              newAmountCents: spec.amountCents,
              message: "[dry-run] Would create new price",
            });
            continue;
          }
          const newPrice = await stripe.prices.create({
            currency: "usd",
            unit_amount: spec.amountCents,
            product: spec.productId,
            lookup_key: spec.lookupKey,
            ...(spec.recurringInterval && {
              recurring: { interval: spec.recurringInterval },
            }),
          });
          diff.push({
            lookupKey: spec.lookupKey,
            productId: spec.productId,
            action: "created",
            newAmountCents: spec.amountCents,
            message: `Created ${newPrice.id}`,
          });
        }
      } catch (e: any) {
        console.error(`sync error for ${spec.lookupKey}:`, e);
        diff.push({
          lookupKey: spec.lookupKey,
          productId: spec.productId,
          action: "error",
          newAmountCents: spec.amountCents,
          message: e?.message ?? "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        environment: env,
        dryRun,
        diff,
        summary: {
          total: diff.length,
          unchanged: diff.filter((d) => d.action === "unchanged").length,
          updated: diff.filter((d) => d.action === "updated").length,
          created: diff.filter((d) => d.action === "created").length,
          productCreated: diff.filter((d) => d.action === "product_created").length,
          errors: diff.filter((d) => d.action === "error").length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("sync-stripe-prices fatal:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
