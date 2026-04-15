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

    const reviewBaseUrl = `${SUPABASE_URL}/functions/v1/submit-ticket-review`;
    const generateStarUrl = (rating: number) => 
      `${reviewBaseUrl}?ticketId=${ticketId}&email=${encodeURIComponent(to)}&rating=${rating}`;

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;">
<p>Hi,</p>
<p>Your <strong>Ticket #${ticketNumber}</strong> regarding "${subject}" has been resolved and closed.</p>
<p>Thank you for contacting us! We hope your issue has been resolved to your satisfaction.</p>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
<p><strong>How was your experience?</strong> Click a rating below:</p>
<p style="font-size:24px;">
<a href="${generateStarUrl(1)}" style="text-decoration:none;">1⭐</a> &nbsp;
<a href="${generateStarUrl(2)}" style="text-decoration:none;">2⭐</a> &nbsp;
<a href="${generateStarUrl(3)}" style="text-decoration:none;">3⭐</a> &nbsp;
<a href="${generateStarUrl(4)}" style="text-decoration:none;">4⭐</a> &nbsp;
<a href="${generateStarUrl(5)}" style="text-decoration:none;">5⭐</a>
</p>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
<p>Best regards,<br>PropScholar Support</p>
<p style="font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} PropScholar. All rights reserved.</p>
</body></html>`;

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
