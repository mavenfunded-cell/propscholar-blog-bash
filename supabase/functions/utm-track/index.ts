// Backend function: utm-track
// Receives UTM/session payloads from external sites and upserts into utm_sessions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  session_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const payload = (await req.json()) as Payload;

    const session_id = typeof payload.session_id === "string" ? payload.session_id.trim() : "";
    if (!session_id) return json(400, { error: "session_id_required" });

    const utm_source = typeof payload.utm_source === "string" && payload.utm_source.trim()
      ? payload.utm_source.trim()
      : "direct";
    const utm_medium = typeof payload.utm_medium === "string" && payload.utm_medium.trim()
      ? payload.utm_medium.trim()
      : "none";

    const record = {
      session_id,
      utm_source,
      utm_medium,
      utm_campaign: payload.utm_campaign ?? null,
      utm_content: payload.utm_content ?? null,
      utm_term: payload.utm_term ?? null,
      landing_page: payload.landing_page ?? null,
      referrer: payload.referrer ?? null,
      user_agent: payload.user_agent ?? null,
      last_seen_at: new Date().toISOString(),
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Prefer upsert if session_id is unique; if not, this still behaves as an insert.
    const { error } = await supabase
      .from("utm_sessions")
      .upsert(record as any, { onConflict: "session_id" });

    if (error) return json(200, { success: false, reason: "db_write_failed" });
    return json(200, { success: true });
  } catch (_e) {
    return json(200, { success: false, reason: "bad_request" });
  }
});
