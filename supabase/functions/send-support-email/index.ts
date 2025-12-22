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

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface SendEmailRequest {
  ticketId: string;
  body: string;
  isInternalNote?: boolean;
  attachments?: Attachment[];
  senderName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Sending support email via Hostinger SMTP");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // For admin panel, we use a simple secret-based auth since admin uses sessionStorage
    // The admin panel is already protected by its own auth flow
    const authHeader = req.headers.get("authorization");
    const adminSecret = req.headers.get("x-admin-secret");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Allow if valid admin secret OR valid Supabase JWT with admin role
    let isAuthorized = false;
    
    // Check admin secret first (for sessionStorage-based admin auth)
    if (adminSecret === Deno.env.get("ADMIN_API_SECRET")) {
      isAuthorized = true;
      console.log("Authorized via admin secret");
    } 
    // Fallback to JWT-based auth
    else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      if (!userError && userData.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .single();
          
        if (roleData) {
          isAuthorized = true;
          console.log("Authorized via JWT admin role");
        }
      }
    }

    if (!isAuthorized) {
      console.error("Authorization failed - no valid credentials");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { ticketId, body, isInternalNote, attachments, senderName }: SendEmailRequest = await req.json();

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

    // Use the sender name from request, or default to FROM_NAME
    const displaySenderName = senderName ? `${senderName} - PropScholar Support` : FROM_NAME;

    // Insert message into database with attachments
    const { data: newMessage, error: insertError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender_email: SUPPORT_EMAIL,
        sender_name: displaySenderName,
        sender_type: "admin",
        body: body,
        message_id: messageId,
        in_reply_to: lastMessage?.message_id || ticket.original_message_id || null,
        is_internal_note: isInternalNote || false,
        attachments: attachments || [],
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

      // HTML escape function to prevent XSS attacks
      const escapeHtml = (unsafe: string): string => {
        return unsafe
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // Convert markdown to HTML for email
      const markdownToHtml = (text: string): string => {
        let html = text;
        
        // Escape HTML first to prevent XSS
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Bold: **text** or __text__
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');
        
        // Inline code: `code`
        html = html.replace(/`(.+?)`/g, '<code style="background-color:rgba(59,130,246,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">$1</code>');
        
        // Links: [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#60a5fa;text-decoration:underline;">$1</a>');
        
        // Headings (at start of line)
        html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 8px 0;">$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:16px 0 8px 0;">$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:600;margin:16px 0 8px 0;">$1</h1>');
        
        // Bullet lists
        html = html.replace(/^- (.+)$/gm, '<li style="margin-left:20px;">$1</li>');
        
        // Numbered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;">$1</li>');
        
        // Blockquote
        html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #3b82f6;padding-left:12px;margin:8px 0;color:#94a3b8;">$1</blockquote>');
        
        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(59,130,246,0.3);margin:16px 0;">');
        
        // Convert newlines to <br>
        html = html.replace(/\n/g, '<br>');
        
        return html;
      };

      // URL validation to prevent javascript: and other malicious schemes
      const isSafeUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      // Build attachments HTML section with sanitization
      let attachmentsHtml = "";
      if (attachments && attachments.length > 0) {
        // Filter out attachments with unsafe URLs
        const safeAttachments = attachments.filter(att => isSafeUrl(att.url));
        
        const attachmentItems = safeAttachments.map(att => {
          const safeName = escapeHtml(att.name || 'attachment');
          const safeUrl = escapeHtml(att.url);
          
          if (att.type?.startsWith('image/')) {
            return `<div style="margin-bottom:12px;"><a href="${safeUrl}" target="_blank" style="text-decoration:none;"><img src="${safeUrl}" alt="${safeName}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid rgba(59,130,246,0.3);display:block;"></a><p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">${safeName}</p></div>`;
          } else {
            return `<div style="margin-bottom:8px;"><a href="${safeUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:8px;text-decoration:none;color:#60a5fa;font-size:13px;">📎 ${safeName}</a></div>`;
          }
        }).join("");

        if (attachmentItems) {
          attachmentsHtml = `<tr><td style="padding:0 32px 20px 32px;"><div style="background:rgba(15,23,42,0.4);border-radius:12px;border:1px solid rgba(59,130,246,0.15);padding:16px;"><p style="margin:0 0 12px 0;font-size:12px;color:#94a3b8;font-weight:600;">ATTACHMENTS</p>${attachmentItems}</div></td></tr>`;
        }
      }

      // Convert markdown to HTML for email body
      const formattedBody = markdownToHtml(body);

      // Clean email template with attachments support
      const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
      const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;">
<tr>
<td style="padding:40px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width:600px;margin:0 auto;">
<tr>
<td style="text-align:center;padding-bottom:24px;">
<img src="${logoUrl}" alt="PropScholar" width="100" height="100" style="max-width:100px;height:auto;display:block;margin:0 auto;border-radius:12px;">
</td>
</tr>
<tr>
<td>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0f172a;border-radius:16px;border:1px solid rgba(59,130,246,0.3);">
<tr>
<td style="height:3px;background:linear-gradient(90deg,#1e40af,#3b82f6,#1e40af);border-radius:16px 16px 0 0;"></td>
</tr>
<tr>
<td style="padding:28px 32px 20px 32px;">
<span style="display:inline-block;background-color:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:6px 14px;font-size:11px;color:#60a5fa;font-weight:600;letter-spacing:0.5px;">TICKET #${ticket.ticket_number}</span>
<h1 style="margin:16px 0 0 0;font-size:22px;font-weight:600;color:#ffffff;">Support Response</h1>
</td>
</tr>
<tr>
<td style="padding:0 32px 20px 32px;">
<div style="background-color:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(59,130,246,0.1);padding:20px;">
<div style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.7;">${formattedBody}</div>
</div>
</td>
</tr>
${attachmentsHtml}
<tr>
<td style="padding:0 32px 24px 32px;text-align:center;">
<p style="margin:0 0 16px 0;color:#94a3b8;font-size:13px;">Reply to this email to continue the conversation</p>
<a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:10px;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Visit PropScholar</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:24px 20px;text-align:center;">
<p style="margin:0;color:#475569;font-size:11px;">&copy; ${new Date().getFullYear()} PropScholar. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

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
          from: `${displaySenderName} <${SUPPORT_EMAIL}>`,
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

      // Keep ticket open, just update last reply info
      await supabase
        .from("support_tickets")
        .update({
          status: "open",
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
