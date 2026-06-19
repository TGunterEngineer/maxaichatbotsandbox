// Pulls Google Business Profile data via Outscraper and stores it as a kb_source.
// Accepts either a Google Maps URL or a free-text query (e.g. "Joe's Pizza Chicago").
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OUTSCRAPER_BASE = "https://api.outscraper.cloud";
const REVIEWS_LIMIT = 10;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

interface OutscraperPlace {
  name?: string;
  full_address?: string;
  phone?: string;
  site?: string;
  type?: string;
  subtypes?: string;
  category?: string;
  description?: string;
  about?: Record<string, unknown> | string;
  working_hours?: Record<string, string> | string;
  rating?: number;
  reviews?: number;
  price_range?: string;
  google_id?: string;
  place_id?: string;
  query?: string;
}

interface OutscraperReview {
  author_title?: string;
  review_rating?: number;
  review_text?: string;
  review_datetime_utc?: string;
}

async function outscraperGet(path: string, apiKey: string): Promise<any> {
  const resp = await fetch(`${OUTSCRAPER_BASE}${path}`, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Outscraper ${resp.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json;
}

// Outscraper async pattern: returns { id, status, results_location } -> poll until status === "Success"
async function pollResults(initial: any, apiKey: string): Promise<any> {
  if (initial?.data) return initial.data;
  const requestId = initial?.id;
  if (!requestId) throw new Error("No request id from Outscraper");
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const result = await outscraperGet(`/requests/${requestId}`, apiKey);
    if (result?.status === "Success") return result.data;
    if (result?.status === "Failed") throw new Error("Outscraper request failed");
  }
  throw new Error("Outscraper request timed out");
}

async function fetchPlace(query: string, apiKey: string): Promise<OutscraperPlace> {
  const params = new URLSearchParams({
    query,
    limit: "1",
    async: "true",
    fields: "name,full_address,phone,site,type,subtypes,category,description,about,working_hours,rating,reviews,price_range,google_id,place_id",
  });
  const initial = await outscraperGet(`/maps/search-v3?${params}`, apiKey);
  const data = await pollResults(initial, apiKey);
  // Outscraper returns array of arrays (one inner array per query)
  const first = Array.isArray(data?.[0]) ? data[0]?.[0] : data?.[0];
  if (!first) throw new Error("No business found for that query");
  return first;
}

async function fetchReviews(query: string, apiKey: string): Promise<OutscraperReview[]> {
  const params = new URLSearchParams({
    query,
    reviewsLimit: String(REVIEWS_LIMIT),
    sort: "newest",
    async: "true",
  });
  try {
    const initial = await outscraperGet(`/maps/reviews-v3?${params}`, apiKey);
    const data = await pollResults(initial, apiKey);
    const place = Array.isArray(data?.[0]) ? data[0]?.[0] : data?.[0];
    return place?.reviews_data ?? [];
  } catch (e) {
    console.warn("Reviews fetch failed (non-fatal):", (e as Error).message);
    return [];
  }
}

function formatHours(wh: unknown): string {
  if (!wh) return "";
  if (typeof wh === "string") return wh;
  if (typeof wh === "object") {
    return Object.entries(wh as Record<string, string>)
      .map(([day, hrs]) => `  ${day}: ${hrs}`)
      .join("\n");
  }
  return "";
}

function buildContent(place: OutscraperPlace, reviews: OutscraperReview[]): string {
  const lines: string[] = [];
  lines.push(`# ${place.name ?? "Business"}`);
  if (place.category || place.type) lines.push(`Category: ${place.category ?? place.type}`);
  if (place.subtypes) lines.push(`Services: ${place.subtypes}`);
  if (place.full_address) lines.push(`Address: ${place.full_address}`);
  if (place.phone) lines.push(`Phone: ${place.phone}`);
  if (place.site) lines.push(`Website: ${place.site}`);
  if (place.price_range) lines.push(`Price range: ${place.price_range}`);
  if (place.rating) lines.push(`Google rating: ${place.rating} (${place.reviews ?? 0} reviews)`);

  if (place.description) {
    lines.push("", "## Description", place.description);
  }

  const hours = formatHours(place.working_hours);
  if (hours) lines.push("", "## Hours", hours);

  if (place.about && typeof place.about === "object") {
    const aboutLines: string[] = [];
    for (const [section, attrs] of Object.entries(place.about as Record<string, unknown>)) {
      if (attrs && typeof attrs === "object") {
        const items = Object.entries(attrs as Record<string, unknown>)
          .filter(([, v]) => v === true || typeof v === "string")
          .map(([k]) => k);
        if (items.length) aboutLines.push(`- ${section}: ${items.join(", ")}`);
      }
    }
    if (aboutLines.length) lines.push("", "## About", ...aboutLines);
  }

  if (reviews.length) {
    lines.push("", "## Recent customer reviews");
    for (const r of reviews.slice(0, REVIEWS_LIMIT)) {
      const author = r.author_title ?? "Anonymous";
      const rating = r.review_rating ? `${r.review_rating}★` : "";
      const text = (r.review_text ?? "").trim();
      if (text) lines.push(`- ${author} ${rating}: ${text}`);
    }
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const outscraperKey = Deno.env.get("OUTSCRAPER_API_KEY");
    if (!outscraperKey) {
      return new Response(JSON.stringify({ error: "OUTSCRAPER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user } } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const organization_id: string | undefined = body.organization_id;
    const query: string | undefined = body.query;
    const auto_sync: boolean = body.auto_sync ?? true;
    const source_id: string | undefined = body.source_id; // optional, for re-sync

    if (!organization_id || typeof organization_id !== "string") {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isMember } = await admin.rpc("is_org_member", {
      _user_id: user.id, _org_id: organization_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plan gate: Google Business requires Essential+
    const { data: hasFeature } = await admin.rpc("org_has_feature", {
      _org_id: organization_id, _feature: "google_business",
    });
    if (!hasFeature) {
      return new Response(JSON.stringify({ error: "Google Business integration requires the Essential plan or higher." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // KB source limit
    const [{ data: kbLimit }, { count: currentCount }] = await Promise.all([
      admin.rpc("get_org_kb_limit", { _org_id: organization_id }),
      admin.from("kb_sources").select("id", { count: "exact", head: true }).eq("organization_id", organization_id),
    ]);
    const limit = (kbLimit as number | null) ?? 1;
    if (!source_id && limit < 2_000_000_000 && (currentCount ?? 0) >= limit) {
      return new Response(JSON.stringify({ error: `Your plan allows ${limit} knowledge source${limit === 1 ? "" : "s"}. Upgrade for more.` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let lookupQuery = query?.trim();
    let existingSourceId = source_id;

    // If re-syncing, verify ownership and pull the stored URL/query from the existing row
    if (existingSourceId) {
      const { data: src } = await admin
        .from("kb_sources")
        .select("url, organization_id")
        .eq("id", existingSourceId)
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!src) {
        return new Response(JSON.stringify({ error: "Source not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!lookupQuery) lookupQuery = src.url ?? "";
    }

    if (!lookupQuery) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lookupQuery.length > 500) {
      return new Response(JSON.stringify({ error: "query too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Outscraper accepts both Google Maps URLs and free-text queries directly.
    const place = await fetchPlace(lookupQuery, outscraperKey);
    const reviews = await fetchReviews(lookupQuery, outscraperKey);
    const content = buildContent(place, reviews);
    const label = `Google Business: ${place.name ?? lookupQuery}`;

    if (existingSourceId) {
      await admin.from("kb_sources").update({
        label,
        content,
        char_count: content.length,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", existingSourceId).eq("organization_id", organization_id);
      return new Response(JSON.stringify({ success: true, source_id: existingSourceId, char_count: content.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { data: inserted, error: insErr } = await admin
      .from("kb_sources")
      .insert({
        organization_id,
        kind: "website", // reuse existing enum; label prefix marks it as Google Business
        label,
        url: lookupQuery, // store original query/URL for re-sync
        content,
        char_count: content.length,
        auto_sync,
        last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ success: true, source_id: inserted.id, char_count: content.length, business_name: place.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enrich-google-business error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
