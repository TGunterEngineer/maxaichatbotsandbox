import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the calling user
    const authHeader = req.headers.get("Authorization")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: callingUser }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, organization_id, password } = await req.json();

    if (!email || !organization_id || !password) {
      return new Response(JSON.stringify({ error: "Missing email, organization_id, or password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is owner of this org
    const { data: membership } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("organization_id", organization_id)
      .single();

    if (!membership || membership.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only org owners can invite clients" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce seat limit per plan
    const { data: seatRow, error: seatErr } = await supabase
      .rpc("get_org_seats", { _org_id: organization_id })
      .single();
    if (!seatErr && seatRow) {
      const used = (seatRow as any).used as number;
      const seatLimit = (seatRow as any).seat_limit as number;
      if (used >= seatLimit) {
        return new Response(
          JSON.stringify({
            error: "SEAT_LIMIT_REACHED",
            message: `Your plan allows ${seatLimit} ${seatLimit === 1 ? "user" : "users"}. Upgrade to add more teammates.`,
            used,
            seat_limit: seatLimit,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Create the user account using admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // The handle_new_user trigger already created an auto-org, profile, bot_config, and user_organizations entry.
    // We need to clean those up and reassign the user to the target org.

    // Find the auto-created org (from the trigger)
    const { data: autoMembership } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (autoMembership) {
      const autoOrgId = autoMembership.organization_id;
      // Delete the auto-created membership, bot_config, profile, and org
      await supabase.from("user_organizations").delete().eq("user_id", userId).eq("organization_id", autoOrgId);
      await supabase.from("bot_configs").delete().eq("organization_id", autoOrgId);
      await supabase.from("profiles").delete().eq("user_id", userId);
      await supabase.from("organizations").delete().eq("id", autoOrgId);
    }

    // Delete auto-created admin role
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // Create profile linked to the target org
    await supabase.from("profiles").insert({
      user_id: userId,
      organization_id,
      full_name: "",
    });

    // Add as member (not owner) of the org
    await supabase.from("user_organizations").insert({
      user_id: userId,
      organization_id,
      role: "member",
    });

    // Add member app role
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "member",
    });

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Invite client error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
