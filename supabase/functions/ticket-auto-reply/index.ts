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

interface AutoReplyRequest {
  to: string;
  ticketNumber: number;
  subject: string;
  ticketId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== TICKET AUTO REPLY FUNCTION STARTED ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, ticketNumber, subject, ticketId }: AutoReplyRequest = await req.json();
    console.log("Sending auto-reply to:", to, "for ticket:", ticketNumber);

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
    
    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:24px;"><img src="${logoUrl}" alt="PropScholar" width="100" style="max-width:100px;height:auto;display:block;margin:0 auto;border-radius:12px;"></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:16px;border:1px solid rgba(16,185,129,0.3);"><tr><td style="height:3px;background:linear-gradient(90deg,#059669,#10b981,#059669);border-radius:16px 16px 0 0;"></td></tr><tr><td style="padding:28px 32px;text-align:center;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);width:60px;height:60px;border-radius:50%;margin-bottom:16px;text-align:center;line-height:60px;"><span style="font-size:28px;color:#fff;">✓</span></div><h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#ffffff;">Ticket Received!</h1><p style="margin:0;color:#94a3b8;font-size:14px;">We've got your message and we're on it.</p></td></tr><tr><td style="padding:0 32px 24px 32px;"><div style="background:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(59,130,246,0.1);padding:20px;text-align:center;"><p style="margin:0 0 4px 0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Your Ticket Number</p><p style="margin:0;color:#3b82f6;font-size:32px;font-weight:700;">#${ticketNumber}</p></div></td></tr><tr><td style="padding:0 32px 24px 32px;"><div style="background:rgba(245,158,11,0.1);border-radius:12px;border:1px solid rgba(245,158,11,0.2);padding:20px;text-align:center;"><p style="margin:0 0 4px 0;color:#f8fafc;font-size:14px;font-weight:600;">Expected Response Time</p><p style="margin:0;color:#fbbf24;font-size:24px;font-weight:700;">Within 4 Hours</p></div></td></tr><tr><td style="padding:0 32px 24px 32px;text-align:center;"><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:10px;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Visit PropScholar</a><p style="margin:12px 0 0 0;color:#64748b;font-size:12px;">Reply to this email to add more details</p></td></tr></table></td></tr><tr><td style="padding:24px 20px;text-align:center;"><p style="margin:0;color:#475569;font-size:11px;">© ${new Date().getFullYear()} PropScholar. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

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
        subject: `Ticket #${ticketNumber} Received - We'll respond within 4 hours`,
        content: `Your ticket #${ticketNumber} has been received. We'll respond within 4 hours.`,
        html: htmlContent,
      });
      await client.close();
      console.log("Auto-reply sent successfully");
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
    console.error("Error sending auto-reply:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
