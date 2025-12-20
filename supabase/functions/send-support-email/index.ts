import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hostinger SMTP configuration - ONLY for support@propscholar.com
const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SUPPORT_EMAIL = "support@propscholar.com";
const FROM_NAME = "PropScholar Support";

interface SendEmailRequest {
  ticketId: string;
  body: string;
  isInternalNote?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Sending support email via Hostinger SMTP");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { ticketId, body, isInternalNote }: SendEmailRequest = await req.json();

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket error:", ticketError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate message ID for threading
    const messageId = `<${crypto.randomUUID()}@propscholar.com>`;

    // Get the last message for threading headers
    const { data: lastMessage } = await supabase
      .from("support_messages")
      .select("message_id")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Build references chain for proper threading
    const references: string[] = [];
    if (ticket.original_message_id) {
      references.push(ticket.original_message_id);
    }
    if (lastMessage?.message_id && lastMessage.message_id !== ticket.original_message_id) {
      references.push(lastMessage.message_id);
    }

    // Insert message into database
    const { data: newMessage, error: insertError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender_email: SUPPORT_EMAIL,
        sender_name: FROM_NAME,
        sender_type: "admin",
        body: body,
        message_id: messageId,
        in_reply_to: lastMessage?.message_id || ticket.original_message_id || null,
        is_internal_note: isInternalNote || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    // Only send email if not an internal note
    if (!isInternalNote) {
      // Get Hostinger SMTP credentials
      const smtpUser = Deno.env.get("HOSTINGER_SUPPORT_EMAIL");
      const smtpPassword = Deno.env.get("HOSTINGER_SUPPORT_PASSWORD");

      if (!smtpUser || !smtpPassword) {
        console.error("Hostinger SMTP credentials not configured");
        return new Response(
          JSON.stringify({ error: "Email service not configured" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const subject = `Re: [Ticket #${ticket.ticket_number}] ${ticket.subject}`;

      // Premium email template with PropScholar branding - using minimal whitespace to avoid =20 encoding
      const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0a0a0f;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:32px;"><img src="https://propscholar.space/propscholar-logo.png" alt="PropScholar" width="180" style="max-width:180px;height:auto;"></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(145deg,#13131a 0%,#1a1a24 100%);border-radius:20px;border:1px solid rgba(139,92,246,0.2);box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);"><tr><td style="height:4px;background:linear-gradient(90deg,#8b5cf6,#a78bfa,#c4b5fd,#a78bfa,#8b5cf6);border-radius:20px 20px 0 0;"></td></tr><tr><td style="padding:32px 40px 24px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td><span style="display:inline-block;background:linear-gradient(135deg,rgba(139,92,246,0.2) 0%,rgba(168,85,247,0.2) 100%);border:1px solid rgba(139,92,246,0.3);border-radius:20px;padding:6px 14px;font-size:12px;color:#a78bfa;font-weight:600;letter-spacing:0.5px;">TICKET #${ticket.ticket_number}</span></td></tr><tr><td style="padding-top:16px;"><h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Support Response</h1></td></tr></table></td></tr><tr><td style="padding:0 40px 32px 40px;"><div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:24px;border:1px solid rgba(255,255,255,0.05);"><p style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${body}</p></div></td></tr><tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent);"></div></td></tr><tr><td style="padding:24px 40px 32px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align:center;"><p style="margin:0 0 16px 0;color:#94a3b8;font-size:14px;">Simply reply to this email to continue the conversation</p><a href="mailto:${SUPPORT_EMAIL}?subject=Re:%20[Ticket%20%23${ticket.ticket_number}]%20${encodeURIComponent(ticket.subject)}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);border-radius:10px;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.3px;text-decoration:none;">↩️ Reply to Continue</a></td></tr></table></td></tr><tr><td style="padding:0 40px 32px 40px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align:center;"><a href="https://www.propscholar.com" style="display:inline-block;background:transparent;border:2px solid #8b5cf6;border-radius:10px;padding:12px 24px;color:#a78bfa;font-size:14px;font-weight:600;letter-spacing:0.3px;text-decoration:none;">🚀 Visit PropScholar</a></td></tr></table></td></tr></table></td></tr><tr><td style="padding:32px 20px;text-align:center;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding-bottom:16px;"><span style="color:#64748b;font-size:13px;">Powered by</span><span style="color:#a78bfa;font-size:13px;font-weight:600;"> PropScholar</span></td></tr><tr><td><p style="margin:0;color:#475569;font-size:12px;line-height:1.5;">© ${new Date().getFullYear()} PropScholar. All rights reserved.<br><a href="https://www.propscholar.com" style="color:#8b5cf6;text-decoration:none;">www.propscholar.com</a></p></td></tr></table></td></tr></table></td></tr></table></body></html>`;

      console.log(`Sending email to ${ticket.user_email} via Hostinger SMTP`);

      // Create SMTP client
      const client = new SMTPClient({
        connection: {
          hostname: SMTP_HOST,
          port: SMTP_PORT,
          tls: true,
          auth: {
            username: smtpUser,
            password: smtpPassword,
          },
        },
      });

      try {
        await client.send({
          from: `${FROM_NAME} <${SUPPORT_EMAIL}>`,
          to: ticket.user_email,
          subject: subject,
          content: body,
          html: emailHtml,
          headers: {
            "Message-ID": messageId,
            "Reply-To": SUPPORT_EMAIL,
            ...(lastMessage?.message_id || ticket.original_message_id
              ? { "In-Reply-To": lastMessage?.message_id || ticket.original_message_id }
              : {}),
            ...(references.length > 0
              ? { "References": references.join(" ") }
              : {}),
          },
        });

        await client.close();
        console.log("Email sent successfully via Hostinger SMTP");

      } catch (smtpError: any) {
        console.error("SMTP send error:", smtpError);
        await client.close();
        return new Response(
          JSON.stringify({ error: "Failed to send email", details: smtpError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update ticket status to awaiting_user
      await supabase
        .from("support_tickets")
        .update({
          status: "awaiting_user",
          last_reply_at: new Date().toISOString(),
          last_reply_by: "admin",
        })
        .eq("id", ticketId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: newMessage.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending support email:", error);
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
