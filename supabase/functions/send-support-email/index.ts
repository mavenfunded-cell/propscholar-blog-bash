import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  ticketId: string;
  body: string;
  isInternalNote?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Sending support email");

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

    // Get admin email
    const adminEmail = userData.user.email || "support@propscholar.com";
    const adminName = userData.user.user_metadata?.full_name || "PropScholar Support";

    // Generate message ID for threading
    const messageId = `<${crypto.randomUUID()}@propscholar.space>`;

    // Get the last message for threading headers
    const { data: lastMessage } = await supabase
      .from("support_messages")
      .select("message_id")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Insert message into database
    const { data: newMessage, error: insertError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender_email: "support@propscholar.com",
        sender_name: adminName,
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
      const subject = `Re: [Ticket #${ticket.ticket_number}] ${ticket.subject}`;
      
      // Build references header
      const references: string[] = [];
      if (ticket.original_message_id) {
        references.push(ticket.original_message_id);
      }
      if (lastMessage?.message_id) {
        references.push(lastMessage.message_id);
      }

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">PropScholar Support</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${body}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              Ticket #${ticket.ticket_number} | Reply to this email to continue the conversation
            </p>
          </div>
        </div>
      `;

      const emailResponse = await resend.emails.send({
        from: "PropScholar Support <support@propscholar.com>",
        to: [ticket.user_email],
        subject: subject,
        html: emailHtml,
        headers: {
          "Message-ID": messageId,
          ...(lastMessage?.message_id || ticket.original_message_id
            ? { "In-Reply-To": lastMessage?.message_id || ticket.original_message_id }
            : {}),
          ...(references.length > 0
            ? { References: references.join(" ") }
            : {}),
        },
      });

      console.log("Email sent:", emailResponse);
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
