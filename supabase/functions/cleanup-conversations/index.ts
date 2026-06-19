import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Deletes chat_history rows for sessions that:
//   - have no associated lead (session_id not in leads.session_id), AND
//   - haven't received any new message in the last RETENTION_DAYS days.
// Default retention: 30 days. Override per-call with ?days=N or { days: N } body.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Allow override (admin-callable) but default to 30 days.
    let retentionDays = 30;
    try {
      const url = new URL(req.url);
      const qs = url.searchParams.get("days");
      if (qs) retentionDays = Math.max(1, Math.min(365, parseInt(qs, 10) || 30));
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (typeof body?.days === "number") {
          retentionDays = Math.max(1, Math.min(365, body.days));
        }
      }
    } catch { /* ignore */ }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // Find session_ids whose latest message is older than cutoff
    const { data: stale, error: staleErr } = await supabase
      .from("chat_history")
      .select("session_id, organization_id, created_at")
      .lt("created_at", cutoff);
    if (staleErr) throw staleErr;

    // Bucket sessions and find the max created_at per session
    const sessionLatest = new Map<string, string>();
    for (const row of stale ?? []) {
      const prev = sessionLatest.get(row.session_id);
      if (!prev || new Date(row.created_at) > new Date(prev)) {
        sessionLatest.set(row.session_id, row.created_at);
      }
    }

    if (sessionLatest.size === 0) {
      return new Response(JSON.stringify({ deleted_sessions: 0, deleted_messages: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateSessionIds = Array.from(sessionLatest.keys());

    // Exclude sessions that have ANY message newer than cutoff (still active)
    const { data: recent } = await supabase
      .from("chat_history")
      .select("session_id")
      .in("session_id", candidateSessionIds)
      .gte("created_at", cutoff);
    const activeSessions = new Set((recent ?? []).map((r) => r.session_id));

    // Exclude sessions that produced a lead
    const { data: leads } = await supabase
      .from("leads")
      .select("session_id")
      .in("session_id", candidateSessionIds);
    const leadSessions = new Set((leads ?? []).map((l) => l.session_id).filter(Boolean));

    const deletable = candidateSessionIds.filter(
      (id) => !activeSessions.has(id) && !leadSessions.has(id)
    );

    if (deletable.length === 0) {
      return new Response(JSON.stringify({ deleted_sessions: 0, deleted_messages: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete in chunks to stay safe
    let totalDeleted = 0;
    const CHUNK = 200;
    for (let i = 0; i < deletable.length; i += CHUNK) {
      const slice = deletable.slice(i, i + CHUNK);
      const { error: delErr, count } = await supabase
        .from("chat_history")
        .delete({ count: "exact" })
        .in("session_id", slice);
      if (delErr) throw delErr;
      totalDeleted += count ?? 0;
    }

    return new Response(
      JSON.stringify({ deleted_sessions: deletable.length, deleted_messages: totalDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cleanup-conversations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
