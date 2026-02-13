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
    const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1766327970/Gemini_Generated_Image_hvp9g0hvp9g0hvp9_1_q6pmq8.png";
    const escapedBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    
    const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#000000;">
<tr><td style="padding:48px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="max-width:560px;margin:0 auto;">

<!-- Logo & Brand -->
<tr><td style="text-align:center;padding-bottom:40px;">
<img src="${logoUrl}" alt="PropScholar" width="44" height="44" style="display:inline-block;margin-bottom:16px;">
<p style="margin:0;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#888888;font-weight:600;">PropScholar Business</p>
<div style="width:40px;height:1px;background:#333333;margin:14px auto 0;"></div>
</td></tr>

<!-- Main Card -->
<tr><td>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#111111;border-radius:12px;border:1px solid #1a1a1a;">
<tr><td style="padding:32px;">
<div style="color:#d4d4d4;font-size:14px;line-height:1.8;font-weight:400;">${escapedBody}</div>
</td></tr>
</table>
</td></tr>

<!-- Footer Tagline -->
<tr><td style="padding-top:48px;text-align:center;">
<div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,#333,transparent);margin:0 auto 20px;"></div>
<p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#444444;font-weight:500;">PropScholar — Making The Trading Skill Based</p>
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
