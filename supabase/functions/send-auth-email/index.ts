import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RENDER_BACKEND_URL = "https://propscholar-blog-bash.onrender.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-auth-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    // Handle Supabase Auth Hook format
    const user = payload.user;
    const emailData = payload.email_data;

    if (!user?.email || !emailData) {
      throw new Error("Invalid payload structure");
    }

    const { token_hash, redirect_to, email_action_type } = emailData;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    // Build the magic link URL
    const magicLinkUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    console.log("Sending magic link to:", user.email);
    console.log("Magic link URL:", magicLinkUrl);

    // Send email via Render backend
    const emailResponse = await fetch(`${RENDER_BACKEND_URL}/api/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
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
    console.log("Email sent successfully:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-auth-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: errorMessage } }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
