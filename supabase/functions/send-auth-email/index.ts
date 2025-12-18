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

    const user = payload.user;
    const emailData = payload.email_data;

    if (!user?.email || !emailData) {
      throw new Error("Invalid payload structure");
    }

    const { token_hash, redirect_to, email_action_type } = emailData;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    const magicLinkUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    console.log("Sending magic link to:", user.email);
    console.log("Magic link URL:", magicLinkUrl);

    const emailResponse = await fetch(RENDER_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
        subject: "Welcome to PropScholar Space - Your Verification Link",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #030014; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030014; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                    <!-- Logo -->
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765962713/Untitled_design_3_nkt1ky.png" alt="PropScholar Space" width="80" style="display: block;">
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="background: linear-gradient(180deg, #0f0a2e 0%, #1a0a3e 50%, #0a0a1a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.3);">
                        <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; text-align: center;">
                          Welcome to PropScholar Space
                        </h1>
                        
                        <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                          Your gateway to trading competitions, exclusive rewards, and the PropScholar scholarship program.
                        </p>
                        
                        <!-- Features -->
                        <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
                          <p style="color: #a78bfa; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">What awaits you:</p>
                          <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 8px 0;">- Compete in Blog and Reel competitions</p>
                          <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 8px 0;">- Earn Space Coins for participation</p>
                          <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 8px 0;">- Redeem coins for PropScholar account coupons</p>
                          <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">- Win funded trading accounts</p>
                        </div>
                        
                        <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 24px 0; text-align: center;">
                          Click the button below to verify your email and start your journey. This link expires in 1 hour.
                        </p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="${magicLinkUrl}" 
                                 style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px;">
                                Verify and Enter Space
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                          If you did not request this email, you can safely ignore it.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding-top: 30px; text-align: center;">
                        <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">
                          PropScholar Space - Where Traders Become Scholars
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
