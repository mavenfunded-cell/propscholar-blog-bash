import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const BUSINESS_EMAIL = "business@propscholar.com";
const FROM_NAME = "PropScholar";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: "Not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { to, subject, body, inReplyTo, emailId } = await req.json();

    const smtpUser = Deno.env.get("HOSTINGER_BUSINESS_EMAIL");
    const smtpPass = Deno.env.get("HOSTINGER_BUSINESS_PASSWORD");
    if (!smtpUser || !smtpPass) throw new Error("Business SMTP not configured");

    const messageId = `<${crypto.randomUUID()}@propscholar.com>`;

    // Build email HTML
    const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
    const escapedBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    
    const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" style="background:#020617;"><tr><td style="padding:40px 20px;">
<table width="600" align="center" style="max-width:600px;">
<tr><td style="text-align:center;padding-bottom:24px;">
<img src="${logoUrl}" alt="PropScholar" width="80" style="border-radius:12px;">
</td></tr>
<tr><td>
<table width="100%" style="background:#0f172a;border-radius:16px;border:1px solid rgba(59,130,246,0.3);">
<tr><td style="height:3px;background:linear-gradient(90deg,#1e40af,#3b82f6,#1e40af);border-radius:16px 16px 0 0;"></td></tr>
<tr><td style="padding:28px 32px;">
<div style="color:#e2e8f0;font-size:15px;line-height:1.7;">${escapedBody}</div>
</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center;">
<p style="color:#94a3b8;font-size:13px;">Reply to this email to continue the conversation</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:24px;text-align:center;">
<p style="color:#475569;font-size:11px;">&copy; ${new Date().getFullYear()} PropScholar</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

    const client = new SMTPClient({
      connection: { hostname: SMTP_HOST, port: SMTP_PORT, tls: true, auth: { username: smtpUser, password: smtpPass } },
    });

    const emailConfig: any = {
      from: `${FROM_NAME} <${BUSINESS_EMAIL}>`,
      to,
      subject,
      content: body,
      html: emailHtml,
      headers: {
        "Message-ID": messageId,
        "Reply-To": BUSINESS_EMAIL,
        ...(inReplyTo ? { "In-Reply-To": inReplyTo, "References": inReplyTo } : {}),
      },
    };

    await client.send(emailConfig);
    await client.close();

    // Store outbound email
    const { data: inserted } = await supabase.from("business_emails").insert({
      message_id: messageId,
      in_reply_to: inReplyTo || null,
      direction: "outbound",
      from_email: BUSINESS_EMAIL,
      from_name: FROM_NAME,
      to_email: to,
      subject,
      body_text: body,
      body_html: emailHtml,
      status: "sent",
      received_at: new Date().toISOString(),
    }).select().single();

    // If replying to an email, mark original as replied
    if (emailId) {
      await supabase.from("business_emails").update({ status: "replied" }).eq("id", emailId);
    }

    // Log to email_logs
    await supabase.from("email_logs").insert({
      recipient_email: to,
      subject,
      email_type: "business_reply",
      status: "sent",
      message_body: emailHtml,
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error sending business email:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
