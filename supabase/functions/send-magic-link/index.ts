import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 255;
const ALLOWED_REDIRECT_DOMAINS = ['propscholar.space', 'localhost', '127.0.0.1'];

function validateEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new Error("Email must be a string");
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Email is required");
  }
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    throw new Error("Email is too long");
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new Error("Invalid email format");
  }
  // Check for injection attempts
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new Error("Invalid email format");
  }
  return trimmed;
}

function validateRedirectUrl(redirectTo: unknown): string {
  if (!redirectTo) {
    return "https://propscholar.space";
  }
  if (typeof redirectTo !== 'string') {
    throw new Error("Invalid redirect URL");
  }
  const trimmed = redirectTo.trim();
  if (trimmed.length > 500) {
    throw new Error("Redirect URL is too long");
  }
  try {
    const url = new URL(trimmed);
    const hostname = url.hostname;
    const isAllowed = ALLOWED_REDIRECT_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      console.warn("Blocked redirect to unauthorized domain:", hostname);
      return "https://propscholar.space";
    }
    return trimmed;
  } catch {
    throw new Error("Invalid redirect URL format");
  }
}

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
    const body = await req.json();
    
    // Validate inputs
    const email = validateEmail(body.email);
    const redirectTo = validateRedirectUrl(body.redirectTo);

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
    const magicLinkUrl = `${redirectTo}/auth/verify?token=${token}`;

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
        subject: "Your Verification Link to Sign In",
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
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || emailResult.name || "Failed to send email. Please try Google Sign In instead.");
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
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
