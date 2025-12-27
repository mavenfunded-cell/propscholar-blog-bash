import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const SUPPORT_EMAIL = "support@propscholar.com";
const FROM_NAME = "PropScholar Support";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";

interface AdminUpdateTicketStatusRequest {
  ticketId: string;
  status: TicketStatus;
}

function isValidStatus(value: unknown): value is TicketStatus {
  return (
    value === "open" ||
    value === "awaiting_support" ||
    value === "awaiting_user" ||
    value === "closed"
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Verify admin role via JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - no token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Role check failed:", roleError);
      return new Response(JSON.stringify({ error: "Unauthorized - not an admin" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Admin authenticated:", userData.user.email);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing backend env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Backend not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as Partial<AdminUpdateTicketStatusRequest>;
    const ticketId = body.ticketId;
    const status = body.status;

    if (!ticketId || !isValidStatus(status)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_email, status")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr) throw ticketErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const prevStatus = ticket.status as TicketStatus;

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      closed_at: status === "closed" ? new Date().toISOString() : null,
    };

    const { data: updated, error: updateErr } = await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId)
      .select("id, status, closed_at")
      .maybeSingle();

    if (updateErr) throw updateErr;
    if (!updated) {
      throw new Error("Ticket update failed (no rows updated)");
    }

    // Send email ONLY when transitioning into closed.
    if (status === "closed" && prevStatus !== "closed") {
      const smtpUser = Deno.env.get("HOSTINGER_SUPPORT_EMAIL");
      const smtpPassword = Deno.env.get("HOSTINGER_SUPPORT_PASSWORD");

      if (!smtpUser || !smtpPassword) {
        await supabase
          .from("support_tickets")
          .update({ status: prevStatus, closed_at: null, updated_at: new Date().toISOString() })
          .eq("id", ticketId);

        return new Response(JSON.stringify({ error: "Email service not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
      const reviewBaseUrl = `${SUPABASE_URL}/functions/v1/submit-ticket-review`;

      const generateStarUrl = (rating: number) =>
        `${reviewBaseUrl}?ticketId=${ticketId}&email=${encodeURIComponent(ticket.user_email)}&rating=${rating}`;

      const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#020617;"><tr><td style="padding:40px 20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;margin:0 auto;"><tr><td style="text-align:center;padding-bottom:24px;"><img src="${logoUrl}" alt="PropScholar" width="100" style="max-width:100px;height:auto;display:block;margin:0 auto;border-radius:12px;"></td></tr><tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:16px;border:1px solid rgba(16,185,129,0.3);"><tr><td style="height:3px;background:linear-gradient(90deg,#059669,#10b981,#059669);border-radius:16px 16px 0 0;"></td></tr><tr><td style="padding:28px 32px;text-align:center;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);width:60px;height:60px;border-radius:50%;margin-bottom:16px;text-align:center;line-height:60px;"><span style="font-size:28px;color:#fff;">✓</span></div><h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#ffffff;">Ticket Resolved!</h1><span style="display:inline-block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:6px 14px;font-size:11px;color:#34d399;font-weight:600;">TICKET #${ticket.ticket_number} CLOSED</span></td></tr><tr><td style="padding:0 32px 24px 32px;text-align:center;"><h2 style="margin:0 0 8px 0;color:#f8fafc;font-size:18px;font-weight:600;">Thank You for Contacting Us!</h2><p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">We hope your issue regarding "${ticket.subject}" has been resolved.</p></td></tr><tr><td style="padding:0 32px 24px 32px;"><div style="background:rgba(59,130,246,0.1);border-radius:12px;border:1px solid rgba(59,130,246,0.2);padding:24px;text-align:center;"><p style="margin:0 0 4px 0;color:#f8fafc;font-size:14px;font-weight:600;">How was your experience?</p><p style="margin:0 0 16px 0;color:#94a3b8;font-size:12px;">Click a star to rate our support</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr><td style="padding:0 8px;"><a href="${generateStarUrl(1)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(2)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(3)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(4)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td><td style="padding:0 8px;"><a href="${generateStarUrl(5)}" style="text-decoration:none;font-size:32px;display:block;">⭐</a></td></tr></table></div></td></tr><tr><td style="padding:0 32px 24px 32px;text-align:center;"><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:10px;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Visit PropScholar</a><p style="margin:12px 0 0 0;color:#64748b;font-size:12px;">We look forward to serving you again!</p></td></tr></table></td></tr><tr><td style="padding:24px 20px;text-align:center;"><p style="margin:0;color:#475569;font-size:11px;">© ${new Date().getFullYear()} PropScholar. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;

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
          from: `${FROM_NAME} <${SUPPORT_EMAIL}>`,
          to: ticket.user_email,
          subject: `Ticket #${ticket.ticket_number} Resolved - Thank you for contacting PropScholar!`,
          content: `Your ticket #${ticket.ticket_number} has been resolved. Thank you for contacting PropScholar!`,
          html: htmlContent,
        });
        await client.close();
      } catch (smtpError: any) {
        console.error("SMTP error (ticket close):", smtpError);
        await client.close();

        await supabase
          .from("support_tickets")
          .update({ status: prevStatus, closed_at: null, updated_at: new Date().toISOString() })
          .eq("id", ticketId);

        return new Response(JSON.stringify({ error: "Failed to send close email" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, ticketId, status: updated.status, closedAt: updated.closed_at }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("admin-update-ticket-status error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
