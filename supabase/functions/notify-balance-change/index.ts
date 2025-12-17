import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalanceChangeRequest {
  user_id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string;
  new_balance: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-balance-change: Function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, amount, transaction_type, source, description, new_balance }: BalanceChangeRequest = await req.json();
    
    console.log(`notify-balance-change: Processing for user ${user_id}, amount: ${amount}, type: ${transaction_type}`);

    // Validate inputs
    if (!user_id || amount === undefined) {
      console.error("notify-balance-change: Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user email from user_coins
    const { data: userCoins, error: userError } = await supabase
      .from("user_coins")
      .select("email")
      .eq("user_id", user_id)
      .maybeSingle();

    if (userError) {
      console.error("notify-balance-change: Error fetching user:", userError);
      throw userError;
    }

    if (!userCoins?.email) {
      console.log("notify-balance-change: User email not found");
      return new Response(JSON.stringify({ success: true, message: "User email not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const email = userCoins.email;
    const isEarn = transaction_type === "earn";
    const emoji = isEarn ? "🎉" : "💸";
    const action = isEarn ? "earned" : "spent";
    const colorCode = isEarn ? "#22c55e" : "#ef4444";

    // Format source for display
    const sourceLabels: Record<string, string> = {
      signup: "Welcome Bonus",
      referral: "Referral Reward",
      social_facebook: "Facebook Follow",
      social_instagram: "Instagram Follow",
      social_twitter: "Twitter Follow",
      social_discord: "Discord Follow",
      social_youtube: "YouTube Follow",
      reward_claim: "Reward Redemption",
      participation_blog: "Blog Competition",
      participation_reel: "Reel Competition",
      refund: "Refund",
      admin_adjustment: "Admin Adjustment",
    };
    const sourceLabel = sourceLabels[source] || source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    console.log(`notify-balance-change: Sending email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "PropScholar <notifications@propscholar.space>",
      to: [email],
      subject: `${emoji} You ${action} ${amount} Space Coins!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #080808; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765962713/Untitled_design_3_nkt1ky.png" alt="PropScholar" width="60" style="display: block;">
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1);">
                      <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 20px 0; text-align: center;">
                        ${emoji} Space Coins ${isEarn ? "Earned" : "Spent"}!
                      </h1>
                      
                      <!-- Amount -->
                      <div style="text-align: center; margin-bottom: 24px;">
                        <span style="color: ${colorCode}; font-size: 48px; font-weight: bold;">
                          ${isEarn ? "+" : "-"}${amount}
                        </span>
                        <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 8px 0 0 0;">
                          Space Coins
                        </p>
                      </div>
                      
                      <!-- Details -->
                      <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Source</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <span style="color: #ffffff; font-size: 14px; font-weight: 500;">${sourceLabel}</span>
                            </td>
                          </tr>
                          ${description ? `
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Details</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <span style="color: #ffffff; font-size: 14px;">${description}</span>
                            </td>
                          </tr>
                          ` : ""}
                          <tr>
                            <td style="padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.1);">
                              <span style="color: rgba(255,255,255,0.5); font-size: 14px;">New Balance</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right; border-top: 1px solid rgba(255,255,255,0.1);">
                              <span style="color: #fbbf24; font-size: 18px; font-weight: bold;">${new_balance}</span>
                              <span style="color: rgba(255,255,255,0.5); font-size: 12px;"> coins</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="https://propscholar.space/rewards" 
                               style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                              View Your Rewards →
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
                        ${isEarn ? "Keep earning and unlock amazing rewards!" : "Enjoy your reward!"}
                      </p>
                      <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 10px 0 0 0;">
                        © ${new Date().getFullYear()} PropScholar. All rights reserved.
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
    });

    console.log("notify-balance-change: Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("notify-balance-change: Error:", error);
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
