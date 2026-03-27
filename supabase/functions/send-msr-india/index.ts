import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const MSR_TAG_ID = "d1c01c35-84c8-4aaf-9b56-1938bd407305";
const SUBJECT = "Start Trading at $5 - India's First Trading Scholarship Model";
const PREHEADER = "You Focus On Skill, We Give Scholarship";
const SENDER_NAME = "PropScholar";

function generatePreheaderHtml(preheader: string): string {
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}${"&#8204; &zwnj; ".repeat(30)}</div>`;
}

const HTML_CONTENT = `<!DOCTYPE html><html><head>
  <title>First Trading Scholarship Model</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
  <style type="text/css">
    body { margin: 0; padding: 0; background: #020416; font-family: Verdana, arial, Helvetica, sans-serif; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
${generatePreheaderHtml(PREHEADER)}
<a href="https://www.propscholar.com/" style="text-decoration:none; color:inherit;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#020416;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1774636226/banner_4_viqz9x.webp" alt="PropScholar Dashboard Launch" width="420" style="display:block; width:100%; max-width:420px; height:auto; border-radius:12px;" />
      </td>
    </tr>
  </table>
</a>
<table width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#020416;">
  <tr>
    <td align="center" style="padding:26px 16px 32px 16px;">
      <img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1767615527/Untitled_1080_x_1080_px_1_feanie.png" width="42" height="42" alt="PropScholar" style="display:block; margin-bottom:14px;" />
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:14px;">
        <tr>
          <td style="padding:0 6px;"><a href="https://discord.com/invite/propscholar"><img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1767614949/4_fa1exb.png" width="20" height="20" alt="Discord" style="display:block;"></a></td>
          <td style="padding:0 6px;"><a href="https://x.com/prop_schol86734"><img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1767614949/2_xdbdjh.png" width="20" height="20" alt="X" style="display:block;"></a></td>
          <td style="padding:0 6px;"><a href="https://instagram.com/propscholar"><img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1767614948/1_hqwh4j.png" width="20" height="20" alt="Instagram" style="display:block;"></a></td>
          <td style="padding:0 6px;"><a href="https://youtube.com/@PropScholar"><img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1767614948/3_tmrkcy.png" width="20" height="20" alt="YouTube" style="display:block;"></a></td>
        </tr>
      </table>
      <div style="color:#9ca3af; font-size:11px; line-height:16px; max-width:420px;">
        &copy; 2026 PropScholar. All rights reserved.<br>
        You are receiving this email because you interacted with PropScholar.
      </div>
    </td>
  </tr>
</table>
</body></html>`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all MSR tagged users
    const { data: users, error } = await supabase
      .from("audience_users")
      .select("id, email, first_name")
      .contains("tags", [MSR_TAG_ID]);

    if (error) throw error;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: "No MSR users found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${users.length} MSR users to send to`);

    const smtpUser = Deno.env.get("HOSTINGER_TEAM_EMAIL");
    const smtpPass = Deno.env.get("HOSTINGER_TEAM_PASSWORD");

    if (!smtpUser || !smtpPass) {
      return new Response(JSON.stringify({ error: "Team SMTP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        await transporter.sendMail({
          from: `${SENDER_NAME} <${smtpUser}>`,
          to: user.email,
          subject: SUBJECT,
          html: HTML_CONTENT,
        });
        sent++;
        console.log(`Sent ${sent}/${users.length}: ${user.email}`);

        // Small delay to avoid throttling
        if (sent % 5 === 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err: any) {
        failed++;
        errors.push(`${user.email}: ${err.message}`);
        console.error(`Failed: ${user.email} - ${err.message}`);
      }
    }

    await transporter.close();

    console.log(`Done! Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: users.length, errors: errors.slice(0, 10) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
