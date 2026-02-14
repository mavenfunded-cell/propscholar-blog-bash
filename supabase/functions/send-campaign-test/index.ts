import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Campaign test emails use marketing@propscholar.com - same as production queue
const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const FROM_NAME = "PropScholar";

interface SendTestRequest {
  campaignId: string;
  testEmail: string;
  subject: string;
  htmlContent: string;
  senderEmail: string;
  senderName: string;
  preheader?: string;
}

// Generate preheader HTML that shows as preview text in email clients
function generatePreheaderHtml(preheader: string): string {
  if (!preheader) return "";
  // Hidden preheader text with zero-width spacing to prevent showing in email body
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}${"&#8204; &zwnj; ".repeat(30)}</div>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testEmail, subject, htmlContent, senderEmail, senderName, preheader }: SendTestRequest = await req.json();

    if (!testEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use dual mailbox system (marketing@ / hello@) — same as production queue
    const smtpUser = Deno.env.get("HOSTINGER_MARKETING_EMAIL");
    const smtpPassword = Deno.env.get("HOSTINGER_MARKETING_PASSWORD");

    if (!smtpUser || !smtpPassword) {
      console.error("Marketing SMTP credentials not configured");
      return new Response(
        JSON.stringify({ error: "Marketing email not configured. Please add HOSTINGER_MARKETING_EMAIL and HOSTINGER_MARKETING_PASSWORD secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables for test
    let processedHtml = htmlContent;
    processedHtml = processedHtml.replace(/\{\{first_name\}\}/g, "Test User");
    processedHtml = processedHtml.replace(/\{\{email\}\}/g, testEmail);
    processedHtml = processedHtml.replace(/\{\{unsubscribe_url\}\}/g, "#");
    processedHtml = processedHtml.replace(/\{\{subject\}\}/g, subject);

    // Inject preheader right after <body> tag
    if (preheader) {
      const preheaderHtml = generatePreheaderHtml(preheader);
      if (/<body[^>]*>/i.test(processedHtml)) {
        processedHtml = processedHtml.replace(/(<body[^>]*>)/i, `$1${preheaderHtml}`);
      } else {
        // If no body tag, prepend to content
        processedHtml = preheaderHtml + processedHtml;
      }
    }

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    // Always use the authenticated SMTP email as sender to avoid rejection
    await client.send({
      from: `${senderName || FROM_NAME} <${smtpUser}>`,
      to: testEmail,
      subject: `[TEST] ${subject}`,
      content: "auto",
      html: processedHtml,
    });

    await client.close();

    console.log(`Test email sent to ${testEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
