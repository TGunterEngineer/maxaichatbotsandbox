// Re-scrapes a website kb_source. Can be called by an org member (manual)
// or by the weekly cron job using the service role key.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 50_000;

function isPrivateIP(hostname: string): boolean {
  const patterns = [
    /^localhost$/i, /^127\./, /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./, /^169\.254\./, /^0\./,
    /^\[::1\]$/, /^\[fc/i, /^\[fd/i, /^\[fe80:/i,
  ];
  return patterns.some((p) => p.test(hostname));
}

function stripHtml(html: string): string {
  let text = html.replace(/<(script|style|noscript|svg|path)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  text = text.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n");
  return text.trim();
}

async function scrape(url: string): Promise<{ text?: string; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return { error: "Invalid URL" };
  }
  if (isPrivateIP(parsed.hostname)) return { error: "Private/internal address blocked" };
  try {
    const resp = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });
    // Reject redirects to prevent SSRF bypass via open redirects to internal IPs
    if (resp.status >= 300 && resp.status < 400) {
      return { error: "URL returned a redirect, which is not allowed" };
    }
    if (!resp.ok) return { error: `HTTP ${resp.status}` };
    const html = await resp.text();
    return { text: stripHtml(html).slice(0, MAX_CHARS) };
  } catch (e: any) {
    return { error: e.message ?? "Fetch failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { source_id, all_due } = await req.json().catch(() => ({}));

    // Mode A: re-scrape all auto_sync sources older than 7 days (cron use, service role only)
    if (all_due) {
      if (!isServiceRole(req)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: due } = await admin
        .from("kb_sources")
        .select("id, url, label, organization_id")
        .eq("kind", "website")
        .eq("auto_sync", true)
        .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
        .limit(50);

      let processed = 0;
      for (const s of due ?? []) {
        if (!s.url) continue;
        // Route Google Business sources to the Outscraper enricher
        if ((s as any).label?.startsWith("Google Business:")) {
          await fetch(`${supabaseUrl}/functions/v1/enrich-google-business`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ source_id: s.id, organization_id: (s as any).organization_id }),
          }).catch(() => {});
          processed++;
          continue;
        }
        const result = await scrape(s.url);
        await admin
          .from("kb_sources")
          .update({
            content: result.text ?? null,
            char_count: result.text?.length ?? 0,
            last_synced_at: new Date().toISOString(),
            last_error: result.error ?? null,
          })
          .eq("id", s.id);
        processed++;
      }
      return new Response(JSON.stringify({ processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode B: manual single-source resync — requires auth
    if (!source_id) return new Response(JSON.stringify({ error: "source_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: source } = await admin
      .from("kb_sources")
      .select("id, organization_id, url, kind, label")
      .eq("id", source_id).single();
    if (!source || source.kind !== "website" || !source.url) {
      return new Response(JSON.stringify({ error: "Source not found or not a website" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isMember } = await admin.rpc("is_org_member", {
      _user_id: user.id, _org_id: source.organization_id,
    });
    if (!isMember) return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Route Google Business sources to the Outscraper enricher
    if ((source as any).label?.startsWith("Google Business:")) {
      const resp = await fetch(`${supabaseUrl}/functions/v1/enrich-google-business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ source_id: source.id, organization_id: source.organization_id }),
      });
      const json = await resp.json();
      return new Response(JSON.stringify(json), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await scrape(source.url);
    await admin
      .from("kb_sources")
      .update({
        content: result.text ?? null,
        char_count: result.text?.length ?? 0,
        last_synced_at: new Date().toISOString(),
        last_error: result.error ?? null,
      })
      .eq("id", source_id);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, char_count: result.text?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("rescrape-source error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
