import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RENDER_BACKEND_URL = "https://propscholar-blog-bash.onrender.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WinnerNotificationRequest {
  email: string;
  name: string;
  position: number;
  event_title: string;
  winner_type: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-winner: Function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, position, event_title, winner_type }: WinnerNotificationRequest = await req.json();
    
    console.log(`notify-winner: Processing for ${email}, position: ${position}, event: ${event_title}`);

    if (!email || !position || !event_title) {
      console.error("notify-winner: Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const positionText = position === 1 ? "1st Place" : position === 2 ? "2nd Place" : "3rd Place";
    const competitionType = winner_type === 'blog' ? 'Blog Competition' : 'Reel Competition';

    console.log(`notify-winner: Sending email to ${email}`);

    const emailResponse = await fetch(RENDER_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: `Congratulations - You Won ${positionText} in ${event_title}`,
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
                        <div style="text-align: center; margin-bottom: 24px;">
                          <span style="font-size: 64px;">🏆</span>
                        </div>
                        
                        <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 12px 0; text-align: center;">
                          Congratulations${name ? `, ${name}` : ''}
                        </h1>
                        
                        <p style="color: rgba(255,255,255,0.8); font-size: 18px; margin: 0 0 24px 0; text-align: center;">
                          You have won <span style="color: #a78bfa; font-weight: bold;">${positionText}</span>
                        </p>
                        
                        <!-- Event Details -->
                        <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Competition</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <span style="color: #ffffff; font-size: 14px; font-weight: 500;">${event_title}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Type</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <span style="color: #ffffff; font-size: 14px;">${competitionType}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Position</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <span style="color: #a78bfa; font-size: 18px; font-weight: bold;">${positionText}</span>
                              </td>
                            </tr>
                          </table>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.3);">
                          <p style="color: #ffffff; font-size: 16px; margin: 0; text-align: center;">
                            <strong>Claim your reward now</strong><br>
                            <span style="color: rgba(255,255,255,0.7); font-size: 14px;">Log in to your PropScholar Space dashboard to claim your prize.</span>
                          </p>
                        </div>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://propscholar.space/dashboard" 
                                 style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                                Claim My Reward
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding-top: 30px; text-align: center;">
                        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                          Your reward will be issued within 48 hours of claiming.
                        </p>
                        <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 10px 0 0 0;">
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
    console.log("notify-winner: Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("notify-winner: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
