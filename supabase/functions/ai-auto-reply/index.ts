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
const AI_AGENT_NAME = "Alex J";
const SENDER_DISPLAY = `${AI_AGENT_NAME} - PropScholar Support`;

const FORBIDDEN_ACCOUNT_STATUS_PATTERNS = [
  /\bbreach(?:ed)?\b/i,
  /\bflag(?:ged)?\b/i,
  /\bbann?ed\b/i,
  /\bsuspend(?:ed)?\b/i,
  /\bdisable(?:d)?\b/i,
  /\brestrict(?:ed|ion)?\b/i,
  /\bviolat(?:e|ed|ion|ing)\b/i,
  /\bterminate(?:d)?\b/i,
  /\breject(?:ed|ion)?\b/i,
  /\bdisqualif(?:ied|y)\b/i,
  /\bnot eligible\b/i,
];

const hasUnsafeAccountStatusClaim = (text: string) =>
  FORBIDDEN_ACCOUNT_STATUS_PATTERNS.some((pattern) => pattern.test(text));

const buildSafeReviewReply = () => `Hi,

Thank you for your patience. I'm checking this with our team right now, and I don't want to give you an incorrect update before the review is complete.

Please give us a little time while we verify everything properly. We'll come back to you with a confirmed update as soon as the review is finished.

If you'd like, you can reply with any extra details or screenshots in the meantime and I'll add them to the review.

Best,
${AI_AGENT_NAME}
PropScholar Support`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("=== AI AUTO-REPLY CHECK STARTED ===");

    // Find tickets where last reply was from user and it's been 3h50m+ with no admin reply
    const cutoff = new Date(Date.now() - (3 * 60 + 50) * 60 * 1000).toISOString();

    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select("*")
      .in("status", ["open", "awaiting_support"])
      .eq("last_reply_by", "user")
      .lt("last_reply_at", cutoff)
      .is("closed_at", null);

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      throw ticketsError;
    }

    if (!tickets || tickets.length === 0) {
      console.log("No tickets need AI auto-reply");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${tickets.length} ticket(s) needing AI auto-reply`);

    // Check if ticket already got an AI auto-reply (prevent duplicate replies)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const smtpUser = Deno.env.get("HOSTINGER_SUPPORT_EMAIL");
    const smtpPassword = Deno.env.get("HOSTINGER_SUPPORT_PASSWORD");
    if (!smtpUser || !smtpPassword) {
      throw new Error("SMTP credentials not configured");
    }

    // Fetch knowledge base once
    const { data: knowledgeBase } = await supabase
      .from("ai_knowledge_base")
      .select("title, content, category")
      .eq("is_active", true);

    const knowledgeContext = knowledgeBase?.map(kb =>
      `[${kb.category}] ${kb.title}: ${kb.content}`
    ).join("\n") || "";

    let processed = 0;

    for (const ticket of tickets) {
      try {
        // Check if we already sent an AI auto-reply for this ticket
        const { data: existingAiReply } = await supabase
          .from("support_messages")
          .select("id")
          .eq("ticket_id", ticket.id)
          .eq("sender_name", SENDER_DISPLAY)
          .limit(1);

        if (existingAiReply && existingAiReply.length > 0) {
          console.log(`Ticket #${ticket.ticket_number}: Already has AI reply, skipping`);
          continue;
        }

        // Get conversation history
        const { data: messages } = await supabase
          .from("support_messages")
          .select("sender_type, sender_name, body, created_at")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: true });

        const conversationContext = messages?.map(m =>
          `${m.sender_type === 'user' ? 'Customer' : 'Support'}: ${m.body}`
        ).join("\n") || "";

        // Generate AI reply
        const systemPrompt = `You are Alex J, a senior support agent at PropScholar. You are helpful, professional, warm, and respectful. You respond as a real human — never reveal you are AI.

CRITICAL IDENTITY:
- Your name is Alex J. You work at PropScholar Support.
- PropScholar is a scholarship-based trading evaluation platform (NOT a prop firm). Tagline: "You Pass, We Pay."
- Founded by Suman Saurav (CEO) and Shivam Banerjee (Co-Founder).

CORE KNOWLEDGE:
${knowledgeContext}

SAFE RESPONSE MISSION:
- This is an interim holding reply while the team reviews the case.
- Your main job is to acknowledge the customer, say you are checking internally, ask for a little time, and promise a confirmed follow-up.
- Do NOT make final decisions, diagnoses, or account-status conclusions.

GENERAL FACTS (use only when they help and only if safe):
- $5 entry fee, 400% scholarship refund, direct payouts within 4 hours (most within 1 hour)
- Rules: No lot limit, No consistency rule, No trailing drawdown, No news restrictions, No minimum holding, No time limit
- Profit Target: 10%, Max Drawdown: 6%, Daily Loss: 3%, Leverage: 1:50
- Payments: UPI (PhonePe/Razorpay/Cashfree), Crypto, Card, PayPal. Credentials in 120 seconds.
- After passing: Direct payout (no funded stage, no activation fee)
- Platforms: PropScholar Trial ($1), FTMO, Instant, QT, Maven, Goat Funded Trader, Funding Pips, Blueberry Funded, Alpha Capital Group, 5%ers
- Community: Discord (2500+ members), Instagram (@propscholar), X (@propscholar)
- Support: support@propscholar.com, help.propscholar.com

TERMINOLOGY:
- Say "scholarship" not "funded account"
- Say "evaluation" not "challenge"
- Say "direct payout" not "withdrawal"

RESPONSE RULES:
1. Keep it human, calm, and respectful.
2. Default to review language such as "I'm checking this for you", "Please give me a little time", "We're reviewing this internally", and "We'll get back to you with a confirmed update."
3. NEVER state or imply that an account/evaluation is breached, flagged, banned, suspended, restricted, disabled, rejected, disqualified, or in violation unless a verified human has already explicitly confirmed that exact status in the conversation history.
4. NEVER infer account status from partial context, policy knowledge, or the customer's complaint.
5. For any account-specific, payout, platform, rule, or unclear issue, do not solve it conclusively — acknowledge it and hold the conversation while review is underway.
6. You may ask for extra details or screenshots if helpful.
7. Keep it concise: 2-5 sentences plus a natural sign-off.
8. NEVER say "I'm an AI" or "as an AI".
9. Use markdown only when helpful.
10. Always end with a calm offer to help further after the review.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
                { role: "user", content: `TICKET SUBJECT: ${ticket.subject}\nCUSTOMER EMAIL: ${ticket.user_email}\n\nCONVERSATION:\n${conversationContext}\n\nWrite a safe holding reply to the customer's latest message. Acknowledge the issue, say you're checking with the team, ask for a little time, and avoid any account-status assumptions or final conclusions. Do NOT include a subject line — just the reply body.` },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI gateway error for ticket #${ticket.ticket_number}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        let replyBody = aiData.choices?.[0]?.message?.content?.trim();

        if (!replyBody) {
          console.error(`Empty AI response for ticket #${ticket.ticket_number}`);
          continue;
        }

        if (hasUnsafeAccountStatusClaim(replyBody)) {
          console.warn(`Unsafe account-status claim detected for ticket #${ticket.ticket_number}; replacing with safe holding reply`);
          replyBody = buildSafeReviewReply();
        }

        console.log(`Generated AI reply for ticket #${ticket.ticket_number}`);

        // Insert message into database
        const messageId = `<${crypto.randomUUID()}@propscholar.com>`;

        const { data: lastMessage } = await supabase
          .from("support_messages")
          .select("message_id")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const references: string[] = [];
        if (ticket.original_message_id) references.push(ticket.original_message_id);
        if (lastMessage?.message_id && lastMessage.message_id !== ticket.original_message_id) {
          references.push(lastMessage.message_id);
        }

        await supabase.from("support_messages").insert({
          ticket_id: ticket.id,
          sender_email: SUPPORT_EMAIL,
          sender_name: SENDER_DISPLAY,
          sender_type: "admin",
          body: replyBody,
          message_id: messageId,
          in_reply_to: lastMessage?.message_id || ticket.original_message_id || null,
          is_internal_note: false,
          attachments: [],
        });

        // Send email via SMTP
        const markdownToHtml = (text: string): string => {
          let html = text;
          html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
          html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
          html = html.replace(/_(.+?)_/g, '<em>$1</em>');
          html = html.replace(/`(.+?)`/g, '<code style="background-color:rgba(59,130,246,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">$1</code>');
          html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#60a5fa;text-decoration:underline;">$1</a>');
          html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;margin:16px 0 8px 0;">$1</h3>');
          html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:16px 0 8px 0;">$1</h2>');
          html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:600;margin:16px 0 8px 0;">$1</h1>');
          html = html.replace(/^- (.+)$/gm, '<li style="margin-left:20px;">$1</li>');
          html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;">$1</li>');
          html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #3b82f6;padding-left:12px;margin:8px 0;color:#94a3b8;">$1</blockquote>');
          html = html.replace(/\n/g, '<br>');
          return html;
        };

        const formattedBody = markdownToHtml(replyBody);
        const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";

        const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:24px;"><img src="${logoUrl}" alt="PropScholar" width="100" style="max-width:100px;height:auto;display:block;margin:0 auto;border-radius:12px;"></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0f172a;border-radius:16px;border:1px solid rgba(59,130,246,0.3);"><tr><td style="height:3px;background:linear-gradient(90deg,#1e40af,#3b82f6,#1e40af);border-radius:16px 16px 0 0;"></td></tr><tr><td style="padding:28px 32px 20px 32px;"><span style="display:inline-block;background-color:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:6px 14px;font-size:11px;color:#60a5fa;font-weight:600;letter-spacing:0.5px;">TICKET #${ticket.ticket_number}</span><h1 style="margin:16px 0 0 0;font-size:22px;font-weight:600;color:#ffffff;">Support Response</h1></td></tr><tr><td style="padding:0 32px 20px 32px;"><div style="background-color:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(59,130,246,0.1);padding:20px;"><div style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.7;">${formattedBody}</div></div></td></tr><tr><td style="padding:0 32px 24px 32px;text-align:center;"><p style="margin:0 0 16px 0;color:#94a3b8;font-size:13px;">Reply to this email to continue the conversation</p><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:10px;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Visit PropScholar</a></td></tr></table></td></tr><tr><td style="padding:24px 20px;text-align:center;"><p style="margin:0;color:#475569;font-size:11px;">&copy; ${new Date().getFullYear()} PropScholar. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

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
            from: `${SENDER_DISPLAY} <${SUPPORT_EMAIL}>`,
            to: ticket.user_email,
            subject: `Re: [Ticket #${ticket.ticket_number}] ${ticket.subject}`,
            content: replyBody,
            html: emailHtml,
            headers: {
              "Message-ID": messageId,
              "Reply-To": SUPPORT_EMAIL,
              ...(lastMessage?.message_id || ticket.original_message_id
                ? { "In-Reply-To": lastMessage?.message_id || ticket.original_message_id }
                : {}),
              ...(references.length > 0 ? { References: references.join(" ") } : {}),
            },
          });
          await client.close();
          console.log(`Email sent for ticket #${ticket.ticket_number}`);
        } catch (smtpErr: any) {
          console.error(`SMTP error for ticket #${ticket.ticket_number}:`, smtpErr);
          await client.close();
        }

        // Update ticket status
        await supabase
          .from("support_tickets")
          .update({
            status: "awaiting_user",
            last_reply_at: new Date().toISOString(),
            last_reply_by: "admin",
          })
          .eq("id", ticket.id);

        // Log email
        await supabase.from("email_logs").insert({
          recipient_email: ticket.user_email,
          subject: `Re: [Ticket #${ticket.ticket_number}] ${ticket.subject}`,
          email_type: "ai_auto_reply",
          status: "sent",
        });

        processed++;
        console.log(`✅ AI auto-reply sent for ticket #${ticket.ticket_number}`);
      } catch (ticketErr: any) {
        console.error(`Error processing ticket #${ticket.ticket_number}:`, ticketErr);
      }
    }

    console.log(`=== AI AUTO-REPLY COMPLETE: ${processed}/${tickets.length} processed ===`);

    return new Response(JSON.stringify({ processed, total: tickets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("AI auto-reply error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
