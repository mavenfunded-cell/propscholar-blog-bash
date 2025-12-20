import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
  provider?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, provider }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const displayName = name || email.split('@')[0];
    const providerText = provider === 'google' ? 'Google' : 'email';

    console.log(`Sending welcome email to ${email} (signed up via ${providerText})`);

    const emailResponse = await resend.emails.send({
      from: "PropScholar <support@propscholar.com>",
      to: [email],
      subject: "Welcome to PropScholar – Let's Make Moves 🚀",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PropScholar</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #080808; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080808;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0a0a0a 0%, #111111 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765962713/Untitled_design_3_nkt1ky.png" alt="PropScholar" width="80" style="display: block;">
              <h1 style="margin: 20px 0 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Welcome to PropScholar
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.6; color: #ffffff;">
                Hey ${displayName} 👋
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.8; color: rgba(255,255,255,0.8);">
                You're officially part of the PropScholar fam – and we're hyped to have you! 🎉
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.8; color: rgba(255,255,255,0.8);">
                Whether you're here to flex your writing skills in our <strong style="color: #ffffff;">blog competitions</strong>, rack up <strong style="color: #ffffff;">PropCoins</strong>, or chase those sweet rewards... you're in the right place.
              </p>
              
              <!-- Divider -->
              <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); margin: 30px 0;"></div>
              
              <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 600; color: #ffffff;">
                Here's what's waiting for you:
              </h2>
              
              <!-- Feature List -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 15px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">✍️</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #ffffff; font-size: 15px;">Blog Competitions</strong>
                          <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5;">Write. Compete. Win real prizes and bragging rights.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">🪙</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #ffffff; font-size: 15px;">PropCoins</strong>
                          <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5;">Earn coins by participating, referring friends, and staying active.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">🎁</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #ffffff; font-size: 15px;">Exclusive Rewards</strong>
                          <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5;">Redeem your coins for prop firm discounts, coupons & more.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">🔗</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #ffffff; font-size: 15px;">Referrals</strong>
                          <p style="margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5;">Bring your trader squad and earn bonus coins together.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); margin: 30px 0;"></div>
              
              <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.8; color: rgba(255,255,255,0.8);">
                So go ahead – explore your dashboard, check out the latest competitions, and start stacking those coins.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://propscholar.space/dashboard" style="display: inline-block; padding: 16px 40px; background: #ffffff; color: #080808; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.8; color: rgba(255,255,255,0.8);">
                Let's get it 💪
              </p>
              <p style="margin: 15px 0 0; font-size: 16px; color: #ffffff;">
                <strong>– Team PropScholar</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.3);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px; font-size: 12px; color: rgba(255,255,255,0.4);">
                      You're receiving this email because you signed up for PropScholar.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.4);">
                      © ${new Date().getFullYear()} PropScholar. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
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

    console.log("Welcome email sent successfully:", emailResponse);

    // Log the email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("email_logs").insert({
      recipient_email: email,
      subject: "Welcome to PropScholar – Let's Make Moves 🚀",
      email_type: "welcome",
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
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
