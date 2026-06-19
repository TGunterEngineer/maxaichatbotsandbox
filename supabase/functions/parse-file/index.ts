// Parses an uploaded file in the kb-files bucket and stores extracted text
// on the matching kb_sources row. Supports TXT, MD, PDF.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// @ts-ignore deno esm.sh
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 80_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { source_id } = await req.json();
    if (!source_id || typeof source_id !== "string") {
      return json({ error: "source_id required" }, 400);
    }

    const { data: source, error: srcErr } = await admin
      .from("kb_sources")
      .select("id, organization_id, file_path, label")
      .eq("id", source_id)
      .single();
    if (srcErr || !source) return json({ error: "Source not found" }, 404);

    // Verify caller is org member
    const { data: isMember } = await admin.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: source.organization_id,
    });
    if (!isMember) return json({ error: "Forbidden" }, 403);
    if (!source.file_path) return json({ error: "Source has no file" }, 400);

    // Download file from private bucket
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("kb-files")
      .download(source.file_path);
    if (dlErr || !fileBlob) {
      await admin
        .from("kb_sources")
        .update({ last_error: `Download failed: ${dlErr?.message ?? "unknown"}` })
        .eq("id", source_id);
      return json({ error: "Failed to download file" }, 500);
    }

    const lower = source.file_path.toLowerCase();
    let text = "";

    if (lower.endsWith(".pdf")) {
      const buf = new Uint8Array(await fileBlob.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const result = await extractText(pdf, { mergePages: true });
      text = typeof result.text === "string" ? result.text : (result.text as string[]).join("\n\n");
    } else {
      // Treat everything else as text (txt, md, csv, etc.)
      text = await fileBlob.text();
    }

    text = text.replace(/\u0000/g, "").trim().slice(0, MAX_CHARS);

    await admin
      .from("kb_sources")
      .update({
        content: text,
        char_count: text.length,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", source_id);

    return json({ success: true, char_count: text.length });
  } catch (e: any) {
    console.error("parse-file error:", e);
    return json({ error: "Failed to parse file" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
