// Cron job — runs Sunday 22:00 UTC (6pm ET / 3pm PT).
// For every active org, computes last 7 days of stats and emails each owner a digest.
// Idempotent per (org, week_start, recipient).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!isServiceRole(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const weekEnd = now;
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRangeLabel = `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`;
    // Use the Sunday (today) as the week_start key for idempotency
    const weekStartKey = now.toISOString().slice(0, 10);

    // Fetch all orgs
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name");
    if (orgErr) throw orgErr;

    // Build owner email lookup
    const { data: owners } = await supabase
      .from("user_organizations")
      .select("user_id, organization_id")
      .eq("role", "owner");
    const ownerIdsByOrg = new Map<string, string[]>();
    for (const o of owners ?? []) {
      const arr = ownerIdsByOrg.get(o.organization_id) ?? [];
      arr.push(o.user_id);
      ownerIdsByOrg.set(o.organization_id, arr);
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailByUserId = new Map<string, string>();
    for (const u of authUsers?.users ?? []) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }

    let sentTotal = 0;
    let skipped = 0;

    for (const org of orgs ?? []) {
      // Tier gate — Growth+ feature
      const { data: hasFeature } = await supabase.rpc("org_has_feature", {
        _org_id: org.id,
        _feature: "weekly_digest",
      });
      if (hasFeature !== true) {
        skipped++;
        continue;
      }

      const ownerIds = ownerIdsByOrg.get(org.id) ?? [];
      const recipients = ownerIds
        .map((id) => emailByUserId.get(id))
        .filter((e): e is string => !!e);
      if (recipients.length === 0) continue;

      // Conversations this week (distinct sessions with at least one user msg)
      const { data: msgsThisWeek } = await supabase
        .from("chat_history")
        .select("session_id, role, content, created_at")
        .eq("organization_id", org.id)
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString());

      const sessionsThisWeek = new Set<string>();
      const userQuestions: string[] = [];
      for (const m of msgsThisWeek ?? []) {
        sessionsThisWeek.add(m.session_id);
        if (m.role === "user" && m.content) userQuestions.push(m.content);
      }
      const conversations = sessionsThisWeek.size;

      // Conversations last week (for trend)
      const { data: msgsLastWeek } = await supabase
        .from("chat_history")
        .select("session_id")
        .eq("organization_id", org.id)
        .gte("created_at", prevWeekStart.toISOString())
        .lt("created_at", weekStart.toISOString());
      const sessionsLastWeek = new Set((msgsLastWeek ?? []).map((m) => m.session_id));
      const conversationsLastWeek = sessionsLastWeek.size;

      // Leads this week
      const { data: leadsThisWeek } = await supabase
        .from("leads")
        .select("id, lead_notes")
        .eq("organization_id", org.id)
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString());

      const leads = leadsThisWeek?.length ?? 0;
      const hotLeads = (leadsThisWeek ?? []).filter(
        (l) => l.lead_notes?.toUpperCase().includes("[HOT]"),
      ).length;

      // Trend
      let conversationsTrend: number | null = null;
      if (conversationsLastWeek > 0) {
        conversationsTrend = Math.round(
          ((conversations - conversationsLastWeek) / conversationsLastWeek) * 100,
        );
      } else if (conversations > 0) {
        conversationsTrend = 100;
      }

      // Top question — most common short user question (very rough heuristic)
      let topQuestion: string | null = null;
      if (userQuestions.length > 0) {
        // Pick the longest question that contains a question mark, capped at 120 chars
        const withQ = userQuestions.filter((q) => q.includes("?") && q.length < 200);
        topQuestion = (withQ[0] || userQuestions[0] || "").slice(0, 120) || null;
      }

      // Skip orgs with zero activity in BOTH weeks (avoid spam)
      if (conversations === 0 && conversationsLastWeek === 0 && leads === 0) {
        skipped++;
        continue;
      }

      for (const recipient of recipients) {
        // Idempotency check
        const { data: existing } = await supabase
          .from("weekly_digests_sent")
          .select("id")
          .eq("organization_id", org.id)
          .eq("week_start", weekStartKey)
          .eq("recipient_email", recipient)
          .limit(1);
        if (existing && existing.length > 0) continue;

        const { error: insertErr } = await supabase
          .from("weekly_digests_sent")
          .insert({
            organization_id: org.id,
            week_start: weekStartKey,
            recipient_email: recipient,
          });
        if (insertErr && !insertErr.message.toLowerCase().includes("duplicate")) {
          console.error("weekly_digests_sent insert err:", insertErr);
          continue;
        }
        if (insertErr) continue;

        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "weekly-digest",
              recipientEmail: recipient,
              idempotencyKey: `weekly-digest-${org.id}-${weekStartKey}-${recipient}`,
              templateData: {
                orgName: org.name,
                weekRangeLabel,
                conversations,
                leads,
                hotLeads,
                topQuestion,
                conversationsTrend,
              },
            },
          });
          sentTotal++;
        } catch (e) {
          console.error(`digest send failed for ${org.id} → ${recipient}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: sentTotal, skipped, weekStartKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-weekly-digest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
