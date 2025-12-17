import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-magic-link function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    console.log("Generating magic link for:", email);

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing unused tokens for this email
    await supabase
      .from('magic_link_tokens')
      .delete()
      .eq('email', email)
      .eq('used', false);

    // Store the token
    const { error: insertError } = await supabase
      .from('magic_link_tokens')
      .insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to store token:", insertError);
      throw new Error("Failed to generate magic link");
    }

    // Build the magic link URL
    const baseUrl = redirectTo || "https://propscholar.space";
    const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

    console.log("Sending magic link to:", email);

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PropScholar <noreply@propscholar.space>",
        to: [email],
        subject: "Your Magic Link to Sign In",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 24px 0; text-align: center;">
                Sign in to PropScholar
              </h1>
              <p style="color: #71717a; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
                Click the button below to securely sign in to your account. This link will expire in 1 hour.
              </p>
              <a href="${magicLinkUrl}" style="display: block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 16px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; text-align: center; margin: 0 0 32px 0;">
                Sign In
              </a>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                PropScholar
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email response:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-magic-link function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
