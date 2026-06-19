// Cron job — runs every 30 min. Finds chat sessions where:
//  - the visitor shared an email (lead exists),
//  - the LAST message is from the assistant,
//  - that last message is at least 2 hours old (and at most 24h old),
//  - we have not already sent a follow-up for this session.
// Sends a "Sorry we missed you" follow-up email and records it.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FOLLOWUP_DELAY_MINUTES = 120;   // 2 hours
const FOLLOWUP_MAX_AGE_MINUTES = 1440; // 24 hours — don't follow up on ancient sessions

interface CandidateSession {
  organization_id: string;
  session_id: string;
  email: string;
  name: string | null;
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

    const now = Date.now();
    const minAgeIso = new Date(now - FOLLOWUP_DELAY_MINUTES * 60_000).toISOString();
    const maxAgeIso = new Date(now - FOLLOWUP_MAX_AGE_MINUTES * 60_000).toISOString();

    // Find leads with a session_id + email captured in the last 24h
    const { data: candidateLeads, error: leadsErr } = await supabase
      .from("leads")
      .select("organization_id, session_id, email, name, created_at")
      .gte("created_at", maxAgeIso)
      .not("email", "is", null)
      .not("session_id", "is", null)
      .limit(200);

    if (leadsErr) throw leadsErr;

    const candidates: CandidateSession[] = [];
    // Cache org → entitlement to avoid repeat RPC calls
    const orgEntitlement = new Map<string, boolean>();
    for (const lead of candidateLeads ?? []) {
      if (!lead.email || !lead.session_id) continue;

      // Tier gate — Growth+ feature
      let entitled = orgEntitlement.get(lead.organization_id);
      if (entitled === undefined) {
        const { data: feat } = await supabase.rpc("org_has_feature", {
          _org_id: lead.organization_id,
          _feature: "missed_chat_followup",
        });
        entitled = feat === true;
        orgEntitlement.set(lead.organization_id, entitled);
      }
      if (!entitled) continue;

      // Already sent a follow-up?
      const { data: existing } = await supabase
        .from("session_followups")
        .select("id")
        .eq("organization_id", lead.organization_id)
        .eq("session_id", lead.session_id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Get the last message in this session
      const { data: lastMsgs } = await supabase
        .from("chat_history")
        .select("role, created_at")
        .eq("organization_id", lead.organization_id)
        .eq("session_id", lead.session_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const last = lastMsgs?.[0];
      if (!last) continue;
      // Must be a bot message (visitor went silent)
      if (last.role !== "assistant") continue;
      // Must be at least FOLLOWUP_DELAY_MINUTES old
      if (last.created_at > minAgeIso) continue;

      candidates.push({
        organization_id: lead.organization_id,
        session_id: lead.session_id,
        email: lead.email,
        name: lead.name,
      });
    }

    let sent = 0;
    for (const c of candidates) {
      try {
        // Get bot config for booking link + last bot message preview
        const [{ data: botCfg }, { data: org }, { data: lastBotMsg }] = await Promise.all([
          supabase
            .from("bot_configs")
            .select("booking_link")
            .eq("organization_id", c.organization_id)
            .maybeSingle(),
          supabase
            .from("organizations")
            .select("name")
            .eq("id", c.organization_id)
            .maybeSingle(),
          supabase
            .from("chat_history")
            .select("content")
            .eq("organization_id", c.organization_id)
            .eq("session_id", c.session_id)
            .eq("role", "assistant")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Record FIRST (idempotency) — if invoke fails the row stops dupes; manual retry via admin
        const { error: insertErr } = await supabase
          .from("session_followups")
          .insert({
            organization_id: c.organization_id,
            session_id: c.session_id,
            recipient_email: c.email,
          });
        // If unique violation, another worker beat us — skip
        if (insertErr && !insertErr.message.toLowerCase().includes("duplicate")) {
          console.error("session_followups insert err:", insertErr);
          continue;
        }
        if (insertErr) continue; // duplicate — already sent

        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "missed-chat-followup",
            recipientEmail: c.email,
            idempotencyKey: `missed-chat-${c.organization_id}-${c.session_id}`,
            templateData: {
              orgName: org?.name || "our team",
              visitorName: c.name,
              bookingLink: botCfg?.booking_link || null,
              lastBotMessage: lastBotMsg?.content || null,
            },
          },
        });
        sent++;
      } catch (e) {
        console.error(`follow-up failed for ${c.session_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ candidates: candidates.length, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-missed-chat-followups error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
