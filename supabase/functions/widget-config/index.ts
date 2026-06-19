import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organization_id");

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const [{ data: botConfig, error: botError }, { data: org, error: orgError }, { data: hasWhiteLabel }] = await Promise.all([
      supabase
        .from("bot_configs")
        .select("bot_name, welcome_message, support_email")
        .eq("organization_id", organizationId)
        .single(),
      supabase
        .from("organizations")
        .select("name, primary_color")
        .eq("id", organizationId)
        .single(),
      supabase.rpc("org_has_feature", { _org_id: organizationId, _feature: "white_label" }),
    ]);

    if (botError || orgError || !botConfig || !org) {
      return new Response(JSON.stringify({ error: "Widget config not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        organization_id: organizationId,
        bot_name: botConfig.bot_name || `${org.name} Assistant`,
        welcome_message: botConfig.welcome_message || "Hello! How can I help you today?",
        primary_color: org.primary_color || "#3B82F6",
        white_label: hasWhiteLabel === true,
        support_email: botConfig.support_email || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("widget-config error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
