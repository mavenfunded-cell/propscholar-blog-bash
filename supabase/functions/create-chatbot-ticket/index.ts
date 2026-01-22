import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "bot" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatbotTicketRequest {
  ticket_id?: string;
  email: string;
  phone?: string;
  problem: string;
  session_id?: string;
  chat_history?: ChatMessage[];
  created_at?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ChatbotTicketRequest = await req.json();
    const { email, phone, problem, session_id, chat_history } = body;

    // Validate required fields
    if (!email || !problem) {
      return new Response(
        JSON.stringify({ error: "Email and problem are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_email: email,
        subject: problem.slice(0, 100) + (problem.length > 100 ? "..." : ""),
        status: "new",
        priority: "medium",
        source: "chatbot",
        phone: phone || null,
        session_id: session_id || null,
        chat_history: chat_history || null,
      })
      .select("id, ticket_number")
      .single();

    if (ticketError) {
      console.error("Error creating ticket:", ticketError);
      return new Response(
        JSON.stringify({ error: "Failed to create ticket", details: ticketError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the initial message
    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        sender_email: email,
        sender_type: "customer",
        body: problem,
        sender_name: email.split("@")[0],
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
    }

    // Trigger auto-reply email
    try {
      const autoReplyResponse = await fetch(`${supabaseUrl}/functions/v1/ticket-auto-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          userEmail: email,
          subject: problem.slice(0, 100),
        }),
      });

      if (!autoReplyResponse.ok) {
        console.error("Auto-reply failed:", await autoReplyResponse.text());
      }
    } catch (autoReplyError) {
      console.error("Error sending auto-reply:", autoReplyError);
    }

    console.log(`Chatbot ticket created: #${ticket.ticket_number} for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        message: `Ticket #${ticket.ticket_number} created successfully. Confirmation email sent.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-chatbot-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
