import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function generatePreheaderHtml(preheader: string): string {
  if (!preheader) return "";
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}${"&#8204; &zwnj; ".repeat(30)}</div>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testEmail, subject, htmlContent, senderName, preheader }: SendTestRequest = await req.json();

    if (!testEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpUser = Deno.env.get("HOSTINGER_MARKETING_EMAIL");
    const smtpPassword = Deno.env.get("HOSTINGER_MARKETING_PASSWORD");

    if (!smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "Marketing email not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables for test
    let processedHtml = htmlContent;
    processedHtml = processedHtml.replace(/\{\{first_name\}\}/g, "Test User");
    processedHtml = processedHtml.replace(/\{\{email\}\}/g, testEmail);
    processedHtml = processedHtml.replace(/\{\{unsubscribe_url\}\}/g, "#");
    processedHtml = processedHtml.replace(/\{\{subject\}\}/g, subject);

    // Inject preheader
    if (preheader) {
      const preheaderHtml = generatePreheaderHtml(preheader);
      if (/<body[^>]*>/i.test(processedHtml)) {
        processedHtml = processedHtml.replace(/(<body[^>]*>)/i, `$1${preheaderHtml}`);
      } else {
        processedHtml = preheaderHtml + processedHtml;
      }
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `${senderName || FROM_NAME} <${smtpUser}>`,
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html: processedHtml,
    });

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
