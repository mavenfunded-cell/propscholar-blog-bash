import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;">
<p>Hi,</p>
<p>We've received your support request and created <strong>Ticket #${ticketNumber}</strong> for it.</p>
<p>Our team will respond within <strong>4 hours</strong>.</p>
<p>You can reply to this email to add more details to your ticket.</p>
<br>
<p>Best regards,<br>PropScholar Support</p>
<hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
<p style="font-size:12px;color:#888;">&copy; ${new Date().getFullYear()} PropScholar. All rights reserved.</p>
</body></html>`;

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: { username: smtpUser, password: smtpPassword },
      },
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

      // Log the email to email_logs table
      await supabase.from("email_logs").insert({
        recipient_email: to,
        subject: `Ticket #${ticketNumber} Received - We'll respond within 4 hours`,
        email_type: "ticket_auto_reply",
        status: "sent",
      });
      console.log("Email logged to database");
    } catch (smtpError: any) {
      console.error("SMTP error:", smtpError);
      await client.close();
      
      // Log failed email
      await supabase.from("email_logs").insert({
        recipient_email: to,
        subject: `Ticket #${ticketNumber} Received - We'll respond within 4 hours`,
        email_type: "ticket_auto_reply",
        status: "failed",
        error_message: smtpError.message || "SMTP error",
      });
      
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
