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
    
    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:32px;"><img src="${logoUrl}" alt="PropScholar" width="200" style="max-width:200px;height:auto;border-radius:8px;"></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:20px;border:1px solid rgba(16,185,129,0.3);box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);"><tr><td style="height:4px;background:linear-gradient(90deg,#059669,#10b981,#34d399,#10b981,#059669);border-radius:20px 20px 0 0;"></td></tr><tr><td style="padding:40px 40px 24px 40px;text-align:center;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align:center;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);width:80px;height:80px;border-radius:50%;margin-bottom:20px;text-align:center;line-height:80px;"><span style="font-size:40px;color:#fff;">✓</span></div></td></tr><tr><td style="text-align:center;"><h1 style="margin:0 0 12px 0;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Ticket Received!</h1><p style="margin:0;color:#94a3b8;font-size:16px;">We've got your message and we're on it.</p></td></tr></table></td></tr><tr><td style="padding:0 40px 32px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(15,23,42,0.8);border-radius:16px;border:1px solid rgba(59,130,246,0.15);"><tr><td style="padding:24px;border-bottom:1px solid rgba(59,130,246,0.15);"><span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Your Ticket Number</span><p style="margin:8px 0 0 0;color:#3b82f6;font-size:36px;font-weight:700;">#${ticketNumber}</p></td></tr><tr><td style="padding:24px;"><span style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Subject</span><p style="margin:8px 0 0 0;color:#f8fafc;font-size:16px;font-weight:500;">${subject}</p></td></tr></table></td></tr><tr><td style="padding:0 40px 32px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(135deg,rgba(245,158,11,0.15) 0%,rgba(217,119,6,0.15) 100%);border-radius:16px;border:1px solid rgba(245,158,11,0.3);"><tr><td style="padding:28px;text-align:center;"><div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);width:50px;height:50px;border-radius:50%;margin-bottom:16px;text-align:center;line-height:50px;"><span style="font-size:24px;color:#fff;">⏱</span></div><p style="margin:0 0 8px 0;color:#f8fafc;font-size:18px;font-weight:600;">Expected Response Time</p><p style="margin:0;color:#fbbf24;font-size:28px;font-weight:700;">Within 4 Hours</p><p style="margin:12px 0 0 0;color:#94a3b8;font-size:14px;">Our team is working hard to resolve your query</p></td></tr></table></td></tr><tr><td style="padding:0 40px 32px 40px;text-align:center;"><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:12px;padding:16px 40px;color:#ffffff;font-size:15px;font-weight:600;letter-spacing:0.3px;text-decoration:none;box-shadow:0 4px 14px rgba(59,130,246,0.4);">Visit PropScholar</a><p style="margin:16px 0 0 0;color:#64748b;font-size:13px;">Reply to this email to add more details to your ticket</p></td></tr></table></td></tr><tr><td style="padding:32px 20px;text-align:center;"><p style="margin:0 0 8px 0;color:#64748b;font-size:12px;">Need urgent help? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none;">${SUPPORT_EMAIL}</a></p><p style="margin:0;color:#475569;font-size:11px;">© ${new Date().getFullYear()} PropScholar. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

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
