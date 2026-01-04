import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only this email can login as admin
const ADMIN_EMAIL = "notehanmalik@gmail.com";

// Session validity in days
const SESSION_VALIDITY_DAYS = 7;

interface VerifyRequest {
  email: string;
  otp: string;
}

// Shared OTP store - In production, use a proper database or Redis
// For edge functions, we'll use a database table to store OTPs
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, otp }: VerifyRequest = await req.json();
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if this is the allowed admin email
    if (normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Unauthorized email address" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP from database
    const { data: otpRecord, error: otpError } = await supabase
      .from('admin_otp_tokens')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('otp', otp)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("Error checking OTP:", otpError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as used
    await supabase
      .from('admin_otp_tokens')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_VALIDITY_DAYS);

    // Store admin session
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        email: normalizedEmail,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        user_agent: req.headers.get('user-agent') || 'unknown',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      });

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean up old expired OTPs
    await supabase
      .from('admin_otp_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    console.log(`Admin session created for ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionToken,
        expiresAt: expiresAt.toISOString(),
        email: normalizedEmail
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error verifying admin OTP:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
