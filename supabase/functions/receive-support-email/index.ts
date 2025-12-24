import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundEmail {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;
}

// Extract text from MIME multipart content
function extractTextFromMime(text: string): string {
  if (!text) return "";
  
  // Check if this is MIME multipart content
  const boundaryMatch = text.match(/^--([a-zA-Z0-9]+)/m);
  if (!boundaryMatch) {
    // Not MIME content, return as-is
    return text;
  }
  
  const boundary = boundaryMatch[1];
  const parts = text.split(new RegExp(`--${boundary}(?:--)?`));
  
  let plainTextContent = "";
  
  for (const part of parts) {
    // Skip empty parts
    if (!part.trim()) continue;
    
    // Check for Content-Type header
    const contentTypeMatch = part.match(/Content-Type:\s*([^;\r\n]+)/i);
    if (!contentTypeMatch) continue;
    
    const contentType = contentTypeMatch[1].toLowerCase().trim();
    
    // We only want text/plain content
    if (contentType === "text/plain") {
      // Find where headers end and content begins (double newline)
      const headerEndIndex = part.search(/\r?\n\r?\n/);
      if (headerEndIndex !== -1) {
        let content = part.substring(headerEndIndex).trim();
        
        // Check if it's quoted-printable encoded
        const encodingMatch = part.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
        if (encodingMatch && encodingMatch[1].toLowerCase().trim() === "quoted-printable") {
          content = decodeQuotedPrintableMime(content);
        }
        
        // Check for base64 encoding
        if (encodingMatch && encodingMatch[1].toLowerCase().trim() === "base64") {
          try {
            content = atob(content.replace(/\s/g, ""));
          } catch {
            // If decoding fails, keep original
          }
        }
        
        plainTextContent = content;
        break; // Found text/plain, use it
      }
    }
  }
  
  return plainTextContent || text;
}

// Decode quoted-printable encoding
function decodeQuotedPrintableMime(text: string): string {
  if (!text) return text;
  
  // Handle soft line breaks (= at end of line)
  let decoded = text.replace(/=\r?\n/g, "");
  
  // Decode =XX hex patterns
  decoded = decoded.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Handle UTF-8 sequences properly
  try {
    // Convert to proper UTF-8
    const bytes: number[] = [];
    for (let i = 0; i < decoded.length; i++) {
      const code = decoded.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      }
    }
    decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch {
    // If conversion fails, return the partially decoded string
  }
  
  return decoded;
}

// Strip quoted content and signatures
function stripQuotedContent(text: string): string {
  if (!text) return "";
  
  // First, extract text from MIME if needed
  const extractedText = extractTextFromMime(text);
  
  const lines = extractedText.split("\n");
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    // Stop at common reply indicators
    if (
      line.match(/^On .+ wrote:$/i) ||
      line.match(/^-{2,}.*Original Message.*-{2,}$/i) ||
      line.match(/^>{1,}/) ||
      line.match(/^From:.*@/i) ||
      line.match(/^Sent:.*\d{4}/i) ||
      line.match(/^--\s*$/) // Signature delimiter
    ) {
      break;
    }
    cleanLines.push(line);
  }
  
  return cleanLines.join("\n").trim();
}

// Check if email is a bounce or auto-reply
function isAutoReply(email: InboundEmail): boolean {
  const subject = email.subject?.toLowerCase() || "";
  const from = email.from?.toLowerCase() || "";
  
  const autoReplyPatterns = [
    "auto-reply",
    "autoreply",
    "automatic reply",
    "out of office",
    "ooo:",
    "vacation reply",
    "delivery status notification",
    "undeliverable",
    "mailer-daemon",
    "postmaster@",
    "noreply@",
    "no-reply@",
  ];
  
  return autoReplyPatterns.some(
    (pattern) => subject.includes(pattern) || from.includes(pattern)
  );
}

// Extract email address from "Name <email@example.com>" format
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}

// Extract name from "Name <email@example.com>" format
function extractName(emailString: string): string | null {
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received support email webhook");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: InboundEmail = await req.json();
    console.log("Email payload:", JSON.stringify(payload, null, 2));

    // Ignore auto-replies and bounces
    if (isAutoReply(payload)) {
      console.log("Ignoring auto-reply/bounce email");
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const senderEmail = extractEmail(payload.from);
    const senderName = extractName(payload.from) || senderEmail.split("@")[0];
    const cleanBody = stripQuotedContent(payload.text || "");
    
    if (!cleanBody.trim()) {
      console.log("Empty email body after stripping quotes");
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "empty_body" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check for duplicate message
    if (payload.messageId) {
      const { data: existingMessage } = await supabase
        .from("support_messages")
        .select("id")
        .eq("message_id", payload.messageId)
        .single();

      if (existingMessage) {
        console.log("Duplicate message detected, ignoring");
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Try to find existing ticket by reply headers
    let ticketId: string | null = null;

    if (payload.inReplyTo || payload.references) {
      const { data: foundTicket } = await supabase.rpc("find_ticket_by_message_ref", {
        _message_id: payload.messageId || null,
        _in_reply_to: payload.inReplyTo || null,
        _references: payload.references || null,
      });
      
      if (foundTicket) {
        ticketId = foundTicket;
        console.log("Found existing ticket:", ticketId);
      }
    }

    // Also try to find by ticket number in subject (e.g., "[Ticket #123]")
    if (!ticketId) {
      const ticketMatch = payload.subject?.match(/\[Ticket #(\d+)\]/i);
      if (ticketMatch) {
        const ticketNumber = parseInt(ticketMatch[1], 10);
        const { data: ticketByNumber } = await supabase
          .from("support_tickets")
          .select("id")
          .eq("ticket_number", ticketNumber)
          .single();
        
        if (ticketByNumber) {
          ticketId = ticketByNumber.id;
          console.log("Found ticket by number:", ticketId);
        }
      }
    }

    // Find user by email
    const { data: userCoins } = await supabase
      .from("user_coins")
      .select("user_id")
      .eq("email", senderEmail)
      .single();

    let isNewTicket = false;

    if (!ticketId) {
      // Create new ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          subject: payload.subject || "No Subject",
          user_email: senderEmail,
          user_id: userCoins?.user_id || null,
          original_message_id: payload.messageId || null,
          status: "open",
        })
        .select("id, ticket_number")
        .single();

      if (ticketError) {
        console.error("Error creating ticket:", ticketError);
        throw ticketError;
      }

      ticketId = newTicket.id;
      isNewTicket = true;
      console.log("Created new ticket:", ticketId, "Number:", newTicket.ticket_number);
    }

    // Insert message
    const { error: messageError } = await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_email: senderEmail,
      sender_name: senderName,
      sender_type: "user",
      body: cleanBody,
      body_html: payload.html || null,
      message_id: payload.messageId || null,
      in_reply_to: payload.inReplyTo || null,
      attachments: payload.attachments || [],
    });

    if (messageError) {
      console.error("Error inserting message:", messageError);
      throw messageError;
    }

    console.log("Successfully processed email into ticket:", ticketId);

    // Get the ticket data
    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select("ticket_number, subject")
      .eq("id", ticketId)
      .single();

    // Update ticket status to open when user replies
    await supabase
      .from("support_tickets")
      .update({
        status: "open",
        last_reply_at: new Date().toISOString(),
        last_reply_by: "user",
      })
      .eq("id", ticketId);

    // Send auto-reply email ONLY for new tickets
    if (isNewTicket && ticketData) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        console.log("Triggering auto-reply for new ticket:", ticketData.ticket_number);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/ticket-auto-reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            to: senderEmail,
            ticketNumber: ticketData.ticket_number,
            subject: ticketData.subject,
            ticketId: ticketId,
          }),
        });
        
        const result = await response.json();
        console.log("Auto-reply response:", result);
      } catch (autoReplyError) {
        console.error("Failed to send auto-reply:", autoReplyError);
        // Don't fail the main request if auto-reply fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, ticketId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing support email:", error);
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
