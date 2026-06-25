import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SUPPORT_EMAIL = "support@propscholar.com";
const FROM_NAME = "PropScholar Support";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FOLLOWUP_AFTER_MS = 4 * 60 * 60 * 1000; // 4 hours
const CLOSE_AFTER_FOLLOWUP_MS = 60 * 60 * 1000; // 1 hour

function makeSmtp() {
  const user = Deno.env.get("HOSTINGER_SUPPORT_EMAIL");
  const pass = Deno.env.get("HOSTINGER_SUPPORT_PASSWORD");
  if (!user || !pass) throw new Error("SMTP credentials not configured");
  return new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: user, password: pass },
    },
  });
}

function followupHtml(ticketNumber: number, subject: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;color:#222;">
<p>Hi,</p>
<p>Just checking in on <strong>Ticket #${ticketNumber}</strong> regarding "${subject}" — are you still there?</p>
<p>We haven't heard back from you in a while. If you still need help, simply reply to this email and we'll continue right where we left off.</p>
<p>If we don't hear from you within the next hour, we'll go ahead and close this ticket. You can always reply later to re-open it.</p>
<p>Best regards,<br>PropScholar Support</p>
<p style="font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} PropScholar. All rights reserved.</p>
</body></html>`;
}

async function sendFollowup(supabase: any, ticket: any) {
  // Get last message for threading
  const { data: lastMessage } = await supabase
    .from("support_messages")
    .select("message_id")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const messageId = `<${crypto.randomUUID()}@propscholar.com>`;
  const references: string[] = [];
  if (ticket.original_message_id) references.push(ticket.original_message_id);
  if (lastMessage?.message_id && lastMessage.message_id !== ticket.original_message_id) {
    references.push(lastMessage.message_id);
  }

  const body = `Hi,\n\nJust checking in on Ticket #${ticket.ticket_number} — are you still there? If you still need help, simply reply to this email. If we don't hear back within the next hour, we'll close this ticket.\n\nBest regards,\nPropScholar Support`;

  const client = makeSmtp();
  try {
    await client.send({
      from: `${FROM_NAME} <${SUPPORT_EMAIL}>`,
      to: ticket.user_email,
      subject: `Re: [Ticket #${ticket.ticket_number}] ${ticket.subject} — still there?`,
      content: body,
      html: followupHtml(ticket.ticket_number, ticket.subject),
      headers: {
        "Message-ID": messageId,
        "Reply-To": SUPPORT_EMAIL,
        ...(lastMessage?.message_id || ticket.original_message_id
          ? { "In-Reply-To": lastMessage?.message_id || ticket.original_message_id }
          : {}),
        ...(references.length > 0 ? { References: references.join(" ") } : {}),
      },
    });
  } finally {
    await client.close();
  }

  await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_email: SUPPORT_EMAIL,
    sender_name: FROM_NAME,
    sender_type: "admin",
    body,
    message_id: messageId,
    in_reply_to: lastMessage?.message_id || ticket.original_message_id || null,
    is_internal_note: false,
    attachments: [],
  });

  const now = new Date().toISOString();
  await supabase
    .from("support_tickets")
    .update({
      followup_sent_at: now,
      last_reply_at: now,
      last_reply_by: "admin",
      status: "awaiting_user",
    })
    .eq("id", ticket.id);

  await supabase.from("email_logs").insert({
    recipient_email: ticket.user_email,
    subject: `Re: [Ticket #${ticket.ticket_number}] ${ticket.subject} — still there?`,
    email_type: "ticket_followup",
    status: "sent",
  });
}

async function closeAndNotify(supabase: any, ticket: any) {
  const now = new Date().toISOString();
  await supabase
    .from("support_tickets")
    .update({
      status: "closed",
      closed_at: now,
      updated_at: now,
      auto_closed: true,
    })
    .eq("id", ticket.id);

  // Send closure email via existing function (handles rating links etc.)
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/ticket-closed-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        to: ticket.user_email,
        ticketNumber: ticket.ticket_number,
        ticketId: ticket.id,
        subject: ticket.subject,
      }),
    });
  } catch (err) {
    console.error(`Failed closure email for ticket #${ticket.ticket_number}:`, err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    console.log("=== TICKET FOLLOWUP/CLOSE CHECK STARTED ===");
    const nowMs = Date.now();
    const followupCutoff = new Date(nowMs - FOLLOWUP_AFTER_MS).toISOString();
    const closeCutoff = new Date(nowMs - CLOSE_AFTER_FOLLOWUP_MS).toISOString();

    // Step 1: Tickets where last reply was admin, 4h+ ago, no followup sent yet
    const { data: pendingFollowup, error: fErr } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_email, original_message_id, last_reply_at, last_reply_by, followup_sent_at, status, closed_at")
      .in("status", ["open", "awaiting_user", "awaiting_support"])
      .eq("last_reply_by", "admin")
      .is("followup_sent_at", null)
      .is("closed_at", null)
      .lt("last_reply_at", followupCutoff);

    if (fErr) throw fErr;

    let followupCount = 0;
    for (const t of pendingFollowup ?? []) {
      try {
        await sendFollowup(supabase, t);
        followupCount++;
        console.log(`✉️  Followup sent for ticket #${t.ticket_number}`);
      } catch (e: any) {
        console.error(`Followup failed for ticket #${t.ticket_number}:`, e?.message || e);
      }
    }

    // Step 2: Tickets where followup was sent 1h+ ago, still no user reply -> close
    const { data: pendingClose, error: cErr } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_email, followup_sent_at, last_reply_by, last_reply_at, status, closed_at")
      .in("status", ["open", "awaiting_user", "awaiting_support"])
      .eq("last_reply_by", "admin")
      .not("followup_sent_at", "is", null)
      .is("closed_at", null)
      .lt("followup_sent_at", closeCutoff);

    if (cErr) throw cErr;

    let closeCount = 0;
    for (const t of pendingClose ?? []) {
      try {
        await closeAndNotify(supabase, t);
        closeCount++;
        console.log(`🔒 Auto-closed ticket #${t.ticket_number}`);
      } catch (e: any) {
        console.error(`Close failed for ticket #${t.ticket_number}:`, e?.message || e);
      }
    }

    console.log(`=== DONE: followups=${followupCount}, closed=${closeCount} ===`);
    return new Response(
      JSON.stringify({ followups: followupCount, closed: closeCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("ticket-followup-close error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});