import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

interface DashTicketRequest {
  email: string;
  phone?: string;
  subject?: string;
  problem: string;
  session_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: DashTicketRequest = await req.json();
    const { email, phone, subject, problem, session_id } = body;

    if (!email || !problem) {
      return new Response(
        JSON.stringify({ error: "Email and problem are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the support ticket with source = "dash"
    const ticketSubject = subject || (problem.slice(0, 100) + (problem.length > 100 ? "..." : ""));
    
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_email: email,
        subject: ticketSubject,
        status: "open",
        priority: "medium",
        source: "dash",
        phone: phone || null,
        session_id: session_id || null,
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

    // Trigger auto-reply email (same flow as chatbot/email tickets)
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
          to: email,
          subject: ticketSubject,
        }),
      });

      if (!autoReplyResponse.ok) {
        console.error("Auto-reply failed:", await autoReplyResponse.text());
      }
    } catch (autoReplyError) {
      console.error("Error sending auto-reply:", autoReplyError);
    }

    console.log(`Dash ticket created: #${ticket.ticket_number} for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        message: `Ticket #${ticket.ticket_number} created successfully.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-dash-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
