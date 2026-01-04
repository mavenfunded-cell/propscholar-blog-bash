import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  sessionToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionToken }: ValidateRequest = await req.json();
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ valid: false, error: "No session token provided" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check session in database
    const { data: session, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Error validating session:", error);
      return new Response(
        JSON.stringify({ valid: false, error: "Failed to validate session" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!session) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired session" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update last accessed time
    await supabase
      .from('admin_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        email: session.email,
        expiresAt: session.expires_at
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error validating admin session:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
