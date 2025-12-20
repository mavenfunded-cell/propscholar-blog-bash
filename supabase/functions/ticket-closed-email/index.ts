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
  console.log("=== TICKET CLOSED EMAIL FUNCTION STARTED ===");
  
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

    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:24px;"><img src="${logoUrl}" alt="PropScholar" width="100" style="max-width:100px;height:auto;display:block;margin:0 auto;border-radius:12px;"></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:16px;border:1px solid rgba(16,185,129,0.3);"><tr><td style="height:3px;background:linear-gradient(90deg,#059669,#10b981,#059669);border-radius:16px 16px 0 0;"></td></tr><tr><td style="padding:28px 32px;text-align:center;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);width:60px;height:60px;border-radius:50%;margin-bottom:16px;text-align:center;line-height:60px;"><span style="font-size:28px;color:#fff;">✓</span></div><h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#ffffff;">Ticket Resolved!</h1><span style="display:inline-block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:6px 14px;font-size:11px;color:#34d399;font-weight:600;">TICKET #${ticketNumber} CLOSED</span></td></tr><tr><td style="padding:0 32px 24px 32px;text-align:center;"><h2 style="margin:0 0 8px 0;color:#f8fafc;font-size:18px;font-weight:600;">Thank You for Contacting Us!</h2><p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">We hope your issue regarding "${subject}" has been resolved.</p></td></tr><tr><td style="padding:0 32px 24px 32px;"><div style="background:rgba(59,130,246,0.1);border-radius:12px;border:1px solid rgba(59,130,246,0.2);padding:24px;text-align:center;"><p style="margin:0 0 4px 0;color:#f8fafc;font-size:14px;font-weight:600;">How was your experience?</p><p style="margin:0 0 16px 0;color:#94a3b8;font-size:12px;">Click a star to rate our support</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="padding:0 8px;"><a href="${generateStarUrl(1)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(2)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(3)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(4)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(5)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td></tr></table></div></td></tr><tr><td style="padding:0 32px 24px 32px;text-align:center;"><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:10px;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Visit PropScholar</a><p style="margin:12px 0 0 0;color:#64748b;font-size:12px;">We look forward to serving you again!</p></td></tr></table></td></tr><tr><td style="padding:24px 20px;text-align:center;"><p style="margin:0;color:#475569;font-size:11px;">© ${new Date().getFullYear()} PropScholar. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

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
