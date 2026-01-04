import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const BATCH_SIZE = 10;
const DELAY_BETWEEN_EMAILS_MS = 2000; // 2 seconds between emails
const MAX_BOUNCE_RATE = 0.05; // Stop if bounce rate exceeds 5%

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get campaigns that are scheduled and ready to send
    const now = new Date().toISOString();
    const { data: campaigns, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .in("status", ["scheduled", "sending"])
      .or(`scheduled_at.lte.${now},status.eq.sending`)
      .limit(5);

    if (campaignError) throw campaignError;
    if (!campaigns?.length) {
      return new Response(
        JSON.stringify({ message: "No campaigns to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpUser = Deno.env.get("HOSTINGER_CAMPAIGN_EMAIL") || Deno.env.get("HOSTINGER_INFO_EMAIL");
    const smtpPassword = Deno.env.get("HOSTINGER_CAMPAIGN_PASSWORD") || Deno.env.get("HOSTINGER_INFO_PASSWORD");

    if (!smtpUser || !smtpPassword) {
      throw new Error("Campaign SMTP credentials not configured");
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

    for (const campaign of campaigns) {
      // Check bounce rate - stop if too high
      if (campaign.sent_count > 10) {
        const bounceRate = campaign.bounce_count / campaign.sent_count;
        if (bounceRate > MAX_BOUNCE_RATE) {
          await supabase
            .from("campaigns")
            .update({ status: "paused" })
            .eq("id", campaign.id);
          console.log(`Campaign ${campaign.id} paused due to high bounce rate: ${(bounceRate * 100).toFixed(1)}%`);
          continue;
        }
      }

      // Mark as sending if just starting
      if (campaign.status === "scheduled") {
        await supabase
          .from("campaigns")
          .update({ status: "sending", started_at: new Date().toISOString() })
          .eq("id", campaign.id);
      }

      // Get pending recipients
      const { data: recipients, error: recipientError } = await supabase
        .from("campaign_recipients")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .limit(BATCH_SIZE);

      if (recipientError) throw recipientError;
      if (!recipients?.length) {
        // No more recipients - mark campaign as sent
        await supabase
          .from("campaigns")
          .update({ status: "sent", completed_at: new Date().toISOString() })
          .eq("id", campaign.id);
        console.log(`Campaign ${campaign.id} completed`);
        continue;
      }

      // Generate tracking URL base
      const trackingBaseUrl = `${supabaseUrl}/functions/v1`;

      // Send emails
      for (const recipient of recipients) {
        try {
          // Replace variables
          let html = campaign.html_content;
          html = html.replace(/\{\{first_name\}\}/g, recipient.first_name || "there");
          html = html.replace(/\{\{email\}\}/g, recipient.email);
          html = html.replace(/\{\{subject\}\}/g, campaign.subject);
          
          // Add tracking pixel
          const trackingPixel = `<img src="${trackingBaseUrl}/track-campaign-open?t=${recipient.tracking_id}" width="1" height="1" style="display:none;" />`;
          html = html.replace("</body>", `${trackingPixel}</body>`);
          
          // Replace links with tracking links
          html = html.replace(
            /href="([^"]+)"/g,
            (match: string, linkUrl: string) => {
              if (linkUrl.includes("unsubscribe") || linkUrl === "#") {
                // Unsubscribe link
                return `href="${trackingBaseUrl}/campaign-unsubscribe?t=${recipient.tracking_id}"`;
              }
              // Tracked link
              const encodedUrl = encodeURIComponent(linkUrl);
              return `href="${trackingBaseUrl}/track-campaign-click?t=${recipient.tracking_id}&url=${encodedUrl}"`;
            }
          );

          await client.send({
            from: `${campaign.sender_name} <${campaign.sender_email}>`,
            to: recipient.email,
            subject: campaign.subject,
            html: html,
            content: campaign.plain_text_content || undefined,
          });

          // Mark as sent
          await supabase
            .from("campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);

          // Update campaign sent count
          await supabase.rpc("increment_campaign_sent", { campaign_id: campaign.id });

          console.log(`Email sent to ${recipient.email}`);

          // Add randomized delay
          const delay = DELAY_BETWEEN_EMAILS_MS + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (emailError: any) {
          console.error(`Failed to send to ${recipient.email}:`, emailError);
          
          // Check if it's a bounce
          const isBounce = emailError.message?.includes("550") || 
                          emailError.message?.includes("invalid") ||
                          emailError.message?.includes("not exist");

          await supabase
            .from("campaign_recipients")
            .update({ 
              status: isBounce ? "bounced" : "failed", 
              error_message: emailError.message 
            })
            .eq("id", recipient.id);

          if (isBounce) {
            await supabase.rpc("increment_campaign_bounce", { campaign_id: campaign.id });
          }
        }
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ success: true, processed: campaigns.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing campaign queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
