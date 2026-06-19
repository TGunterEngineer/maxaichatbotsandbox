import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("get_founder_spots");
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        taken: row?.taken ?? 0,
        total: row?.total ?? 10,
        remaining: row?.remaining ?? 10,
        isOpen: row?.is_open ?? true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("founder-spots error:", e);
    return new Response(
      JSON.stringify({ taken: 0, total: 10, remaining: 10, isOpen: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
