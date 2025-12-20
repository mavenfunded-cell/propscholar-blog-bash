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

// Strip quoted content and signatures
function stripQuotedContent(text: string): string {
  if (!text) return "";
  
  const lines = text.split("\n");
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

    // Get the ticket number for the auto-reply
    const { data: ticketData } = await supabase
      .from("support_tickets")
      .select("ticket_number, subject")
      .eq("id", ticketId)
      .single();

    // Send auto-reply email for new tickets
    if (ticketData) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        
        await fetch(`${supabaseUrl}/functions/v1/ticket-auto-reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            to: senderEmail,
            ticketNumber: ticketData.ticket_number,
            subject: ticketData.subject,
            ticketId: ticketId,
          }),
        });
        console.log("Auto-reply email triggered for ticket:", ticketData.ticket_number);
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
