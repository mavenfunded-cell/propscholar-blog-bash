import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only this email can receive admin OTP
const ADMIN_EMAIL = "notehanmalik@gmail.com";

interface OTPRequest {
  email: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: OTPRequest = await req.json();
    
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if this is the allowed admin email
    if (normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
      console.log(`Unauthorized login attempt from: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized email address" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('admin_otp_tokens')
      .insert({
        email: normalizedEmail,
        otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP via Resend
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "PropScholar Admin <onboarding@resend.dev>",
        to: [normalizedEmail],
        subject: "Your Admin Login OTP - PropScholar",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .card { background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 40px; border: 1px solid #333; }
              h1 { color: #D4AF37; margin: 0 0 10px 0; font-size: 24px; text-align: center; }
              .subtitle { color: #888; text-align: center; margin-bottom: 30px; }
              .otp-box { background: linear-gradient(135deg, #D4AF37 0%, #B8962E 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
              .otp-code { font-size: 42px; font-weight: bold; color: #000; letter-spacing: 8px; font-family: 'Courier New', monospace; }
              .warning { background: rgba(255, 100, 100, 0.1); border: 1px solid rgba(255, 100, 100, 0.3); border-radius: 8px; padding: 15px; margin-top: 20px; }
              .warning p { color: #ff6b6b; margin: 0; font-size: 13px; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              .expiry { color: #D4AF37; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <h1>🔐 Admin Login OTP</h1>
                <p class="subtitle">Use this code to access the admin panel</p>
                
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                
                <p style="text-align: center; color: #888;">
                  This code expires in <span class="expiry">5 minutes</span>
                </p>
                
                <div class="warning">
                  <p>⚠️ Never share this code with anyone. PropScholar staff will never ask for your OTP.</p>
                </div>
                
                <div class="footer">
                  <p>If you didn't request this code, please ignore this email.</p>
                  <p>© ${new Date().getFullYear()} PropScholar. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send OTP email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin OTP sent successfully to:", normalizedEmail);

    // Clean up old expired OTPs
    await supabase
      .from('admin_otp_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending admin OTP:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
