import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Campaign emails use info@propscholar.com - separate from support
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testEmail, subject, htmlContent, senderEmail, senderName }: SendTestRequest = await req.json();

    if (!testEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use campaign SMTP credentials (info@propscholar.com)
    const smtpUser = Deno.env.get("HOSTINGER_CAMPAIGN_EMAIL") || Deno.env.get("HOSTINGER_INFO_EMAIL");
    const smtpPassword = Deno.env.get("HOSTINGER_CAMPAIGN_PASSWORD") || Deno.env.get("HOSTINGER_INFO_PASSWORD");

    if (!smtpUser || !smtpPassword) {
      console.error("Campaign SMTP credentials not configured");
      return new Response(
        JSON.stringify({ error: "Campaign email not configured. Please add HOSTINGER_CAMPAIGN_EMAIL and HOSTINGER_CAMPAIGN_PASSWORD secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables for test
    let processedHtml = htmlContent;
    processedHtml = processedHtml.replace(/\{\{first_name\}\}/g, "Test User");
    processedHtml = processedHtml.replace(/\{\{email\}\}/g, testEmail);
    processedHtml = processedHtml.replace(/\{\{unsubscribe_url\}\}/g, "#");
    processedHtml = processedHtml.replace(/\{\{subject\}\}/g, subject);

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

    await client.send({
      from: `${senderName || FROM_NAME} <${senderEmail || smtpUser}>`,
      to: testEmail,
      subject: `[TEST] ${subject}`,
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
