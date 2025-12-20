import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SUPPORT_EMAIL = "support@propscholar.com";
const FROM_NAME = "PropScholar Support";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

interface TicketClosedRequest {
  to: string;
  ticketNumber: number;
  ticketId: string;
  subject: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, ticketNumber, ticketId, subject }: TicketClosedRequest = await req.json();
    console.log("Sending ticket closed email to:", to, "for ticket:", ticketNumber);

    const smtpUser = Deno.env.get("HOSTINGER_SUPPORT_EMAIL");
    const smtpPassword = Deno.env.get("HOSTINGER_SUPPORT_PASSWORD");

    if (!smtpUser || !smtpPassword) {
      console.error("SMTP credentials not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
    const reviewBaseUrl = `${SUPABASE_URL}/functions/v1/submit-ticket-review`;
    
    const generateStarUrl = (rating: number) => 
      `${reviewBaseUrl}?ticketId=${ticketId}&email=${encodeURIComponent(to)}&rating=${rating}`;

    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:32px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:16px;border:1px solid rgba(16,185,129,0.4);box-shadow:0 8px 32px rgba(16,185,129,0.2),0 0 60px rgba(16,185,129,0.1);"><tr><td style="padding:24px 40px;"><img src="${logoUrl}" alt="PropScholar" width="200" style="max-width:200px;height:auto;display:block;"></td></tr></table></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:20px;border:1px solid rgba(16,185,129,0.3);box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);"><tr><td style="height:4px;background:linear-gradient(90deg,#059669,#10b981,#34d399,#10b981,#059669);border-radius:20px 20px 0 0;"></td></tr><tr><td style="padding:40px 40px 24px 40px;text-align:center;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align:center;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);width:90px;height:90px;border-radius:50%;margin-bottom:20px;text-align:center;line-height:90px;box-shadow:0 8px 24px rgba(16,185,129,0.4);"><span style="font-size:45px;color:#fff;">✓</span></div></td></tr><tr><td style="text-align:center;"><h1 style="margin:0 0 12px 0;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Ticket Resolved!</h1><span style="display:inline-block;background:linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(5,150,105,0.2) 100%);border:1px solid rgba(16,185,129,0.4);border-radius:20px;padding:8px 20px;font-size:13px;color:#34d399;font-weight:600;letter-spacing:0.5px;">TICKET #${ticketNumber} CLOSED</span></td></tr></table></td></tr><tr><td style="padding:0 40px 24px 40px;text-align:center;"><h2 style="margin:0 0 12px 0;color:#f8fafc;font-size:22px;font-weight:600;">Thank You for Contacting Us!</h2><p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">We hope your issue regarding "<strong style="color:#f8fafc;">${subject}</strong>" has been resolved to your satisfaction.</p></td></tr><tr><td style="padding:0 40px 32px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(135deg,rgba(59,130,246,0.1) 0%,rgba(37,99,235,0.1) 100%);border-radius:16px;border:1px solid rgba(59,130,246,0.2);"><tr><td style="padding:32px;text-align:center;"><p style="margin:0 0 8px 0;color:#f8fafc;font-size:18px;font-weight:600;">How was your experience?</p><p style="margin:0 0 24px 0;color:#94a3b8;font-size:14px;">Click a star to rate our support</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="padding:0 10px;"><a href="${generateStarUrl(1)}" style="text-decoration:none;font-size:40px;display:block;">⭐</a></td><td style="padding:0 10px;"><a href="${generateStarUrl(2)}" style="text-decoration:none;font-size:40px;display:block;">⭐</a></td><td style="padding:0 10px;"><a href="${generateStarUrl(3)}" style="text-decoration:none;font-size:40px;display:block;">⭐</a></td><td style="padding:0 10px;"><a href="${generateStarUrl(4)}" style="text-decoration:none;font-size:40px;display:block;">⭐</a></td><td style="padding:0 10px;"><a href="${generateStarUrl(5)}" style="text-decoration:none;font-size:40px;display:block;">⭐</a></td></tr><tr><td style="text-align:center;color:#64748b;font-size:11px;padding-top:8px;">Poor</td><td></td><td style="text-align:center;color:#64748b;font-size:11px;padding-top:8px;">OK</td><td></td><td style="text-align:center;color:#64748b;font-size:11px;padding-top:8px;">Great</td></tr></table></td></tr></table></td></tr><tr><td style="padding:0 40px 32px 40px;text-align:center;"><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:12px;padding:16px 40px;color:#ffffff;font-size:15px;font-weight:600;letter-spacing:0.3px;text-decoration:none;box-shadow:0 4px 14px rgba(59,130,246,0.4);">Visit PropScholar</a><p style="margin:16px 0 0 0;color:#64748b;font-size:14px;">We look forward to serving you again!</p></td></tr></table></td></tr><tr><td style="padding:32px 20px;text-align:center;"><p style="margin:0 0 8px 0;color:#64748b;font-size:12px;">Need more help? Open a new ticket at <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none;">${SUPPORT_EMAIL}</a></p><p style="margin:0;color:#475569;font-size:11px;">© ${new Date().getFullYear()} PropScholar. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: { username: smtpUser, password: smtpPassword },
      },
    });

    try {
      await client.send({
        from: `${FROM_NAME} <${SUPPORT_EMAIL}>`,
        to: to,
        subject: `Ticket #${ticketNumber} Resolved - Thank you for contacting PropScholar!`,
        content: `Your ticket #${ticketNumber} has been resolved. Thank you for contacting PropScholar!`,
        html: htmlContent,
      });
      await client.close();
      console.log("Ticket closed email sent successfully");
    } catch (smtpError: any) {
      console.error("SMTP error:", smtpError);
      await client.close();
      throw smtpError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending ticket closed email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);