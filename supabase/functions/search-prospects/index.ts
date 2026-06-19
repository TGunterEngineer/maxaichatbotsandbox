// Super Admin lead-prospecting tool: search Google Maps via Outscraper and persist
// matching businesses to admin_prospects.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OUTSCRAPER_BASE = "https://api.outscraper.cloud";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
const MAX_LIMIT = 100;

interface OutscraperPlace {
  name?: string;
  full_address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email_1?: string;
  emails?: string[];
  site?: string;
  category?: string;
  type?: string;
  rating?: number;
  reviews?: number;
  google_id?: string;
  place_id?: string;
  location_link?: string;
  url?: string;
}

async function outscraperGet(path: string, apiKey: string): Promise<any> {
  const resp = await fetch(`${OUTSCRAPER_BASE}${path}`, {
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Outscraper ${resp.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("OUTSCRAPER_API_KEY");
    if (!apiKey) throw new Error("OUTSCRAPER_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin privileges required");

    const body = await req.json();
    const query = String(body.query ?? "").trim();
    const limit = Math.min(Math.max(parseInt(String(body.limit ?? "20"), 10) || 20, 1), MAX_LIMIT);
    const enrichEmails = !!body.enrich_emails;

    if (!query) throw new Error("query is required (e.g. 'plumbers in Dallas')");

    // 1. Maps search
    const searchParams = new URLSearchParams({
      query,
      limit: String(limit),
      async: "true",
      fields:
        "name,full_address,city,country,phone,site,category,type,rating,reviews,google_id,place_id,location_link",
    });
    const initial = await outscraperGet(`/maps/search-v3?${searchParams}`, apiKey);
    const data = await pollResults(initial, apiKey);
    const places: OutscraperPlace[] = Array.isArray(data?.[0]) ? data[0] : data ?? [];

    if (!places.length) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Optional email enrichment from websites
    let emailMap: Record<string, string | null> = {};
    if (enrichEmails) {
      const sites = places.map((p) => p.site).filter((s): s is string => !!s);
      if (sites.length) {
        try {
          const emailParams = new URLSearchParams({ async: "true" });
          sites.forEach((s) => emailParams.append("query", s));
          const initEmails = await outscraperGet(
            `/emails-and-contacts?${emailParams}`,
            apiKey,
          );
          const emailData = await pollResults(initEmails, apiKey);
          const rows: any[] = Array.isArray(emailData) ? emailData : [];
          rows.forEach((row) => {
            const site = row?.query ?? row?.domain;
            const email = row?.emails?.[0]?.value ?? row?.email_1 ?? null;
            if (site) emailMap[site] = email;
          });
        } catch (e) {
          console.warn("Email enrichment failed:", (e as Error).message);
        }
      }
    }

    // 3. Insert with service role (admin already verified)
    const admin = createClient(supabaseUrl, serviceKey);
    const rows = places.map((p) => ({
      name: p.name ?? "Unknown",
      phone: p.phone ?? null,
      email: p.site ? emailMap[p.site] ?? null : null,
      website: p.site ?? null,
      address: p.full_address ?? null,
      city: p.city ?? null,
      country: p.country ?? null,
      category: p.category ?? p.type ?? null,
      rating: p.rating ?? null,
      reviews_count: p.reviews ?? null,
      google_maps_url: p.location_link ?? null,
      place_id: p.place_id ?? p.google_id ?? null,
      search_query: query,
      status: "new",
      created_by: userRes.user.id,
    }));

    // Upsert on place_id to dedupe across searches
    const { data: inserted, error: insErr } = await admin
      .from("admin_prospects")
      .upsert(rows, { onConflict: "place_id", ignoreDuplicates: true })
      .select("id");

    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    return new Response(
      JSON.stringify({
        inserted: inserted?.length ?? 0,
        total_found: places.length,
        skipped: places.length - (inserted?.length ?? 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("search-prospects error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
