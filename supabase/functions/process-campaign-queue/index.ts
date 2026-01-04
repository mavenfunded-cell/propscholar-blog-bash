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
const DELAY_BETWEEN_EMAILS_MS = 2000;
const MAX_BOUNCE_RATE = 0.05;
const MAX_CONSECUTIVE_FAILURES = 3; // Stop after 3 consecutive SMTP failures

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
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
      console.error("CRITICAL: Campaign SMTP credentials not configured");
      // Mark all sending campaigns as failed
      for (const campaign of campaigns) {
        await supabase
          .from("campaigns")
          .update({ 
            status: "failed",
            completed_at: new Date().toISOString()
          })
          .eq("id", campaign.id);
        console.log(`Campaign ${campaign.id} marked as failed - no SMTP credentials`);
      }
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured", failed: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderEmail = smtpUser;

    for (const campaign of campaigns) {
      let consecutiveFailures = 0;
      let criticalError = false;

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
        await supabase
          .from("campaigns")
          .update({ status: "sent", completed_at: new Date().toISOString() })
          .eq("id", campaign.id);
        console.log(`Campaign ${campaign.id} completed`);
        continue;
      }

      const trackingBaseUrl = `${supabaseUrl}/functions/v1`;

      // Test SMTP connection first before processing recipients
      let testClient: SMTPClient | null = null;
      try {
        console.log(`Testing SMTP connection for campaign ${campaign.id}...`);
        testClient = new SMTPClient({
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
        await testClient.close();
        console.log(`SMTP connection test successful for campaign ${campaign.id}`);
      } catch (smtpTestError: any) {
        console.error(`CRITICAL: SMTP connection failed for campaign ${campaign.id}:`, smtpTestError.message);
        
        // Mark campaign as failed due to SMTP issues
        await supabase
          .from("campaigns")
          .update({ 
            status: "failed",
            completed_at: new Date().toISOString()
          })
          .eq("id", campaign.id);
        
        // Mark all pending recipients as failed
        await supabase
          .from("campaign_recipients")
          .update({ 
            status: "failed", 
            error_message: `SMTP connection failed: ${smtpTestError.message}` 
          })
          .eq("campaign_id", campaign.id)
          .eq("status", "pending");
        
        console.log(`Campaign ${campaign.id} marked as FAILED - SMTP connection error`);
        continue; // Skip to next campaign
      } finally {
        if (testClient) {
          try { await testClient.close(); } catch {}
        }
      }

      // Send emails
      for (const recipient of recipients) {
        // Stop if we hit too many consecutive failures
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(`Campaign ${campaign.id}: Too many consecutive failures (${consecutiveFailures}), pausing...`);
          await supabase
            .from("campaigns")
            .update({ status: "paused" })
            .eq("id", campaign.id);
          criticalError = true;
          break;
        }

        // Skip if recipient has empty/invalid email
        if (!recipient.email || !recipient.email.includes('@')) {
          console.warn(`Skipping recipient with invalid email: ${recipient.email}`);
          await supabase
            .from("campaign_recipients")
            .update({ 
              status: "failed", 
              error_message: "Invalid email address" 
            })
            .eq("id", recipient.id);
          continue;
        }

        let client: SMTPClient | null = null;
        try {
          client = new SMTPClient({
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
                return `href="${trackingBaseUrl}/campaign-unsubscribe?t=${recipient.tracking_id}"`;
              }
              const encodedUrl = encodeURIComponent(linkUrl);
              return `href="${trackingBaseUrl}/track-campaign-click?t=${recipient.tracking_id}&url=${encodedUrl}"`;
            }
          );

          const senderName = campaign.sender_name || 'PropScholar';

          await client.send({
            from: `${senderName} <${senderEmail}>`,
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
          
          // Reset consecutive failures on success
          consecutiveFailures = 0;

          // Add delay
          const delay = DELAY_BETWEEN_EMAILS_MS + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (emailError: any) {
          console.error(`Failed to send to ${recipient.email}:`, emailError.message);
          consecutiveFailures++;
          
          // Check if it's a critical SMTP error (auth, connection, sender rejection)
          const isCriticalError = 
            emailError.message?.includes("535") || // Auth failed
            emailError.message?.includes("authentication") ||
            emailError.message?.includes("553") || // Sender rejected
            emailError.message?.includes("connection") ||
            emailError.message?.includes("EHLO") ||
            emailError.message?.includes("timed out");

          // Check if it's a bounce (recipient issue, not sender issue)
          const isBounce = 
            emailError.message?.includes("550") || 
            emailError.message?.includes("invalid") ||
            emailError.message?.includes("not exist") ||
            emailError.message?.includes("recipient");

          // Update recipient status
          await supabase
            .from("campaign_recipients")
            .update({ 
              status: isBounce ? "bounced" : "failed", 
              error_message: emailError.message 
            })
            .eq("id", recipient.id);

          // Update bounce count in campaign metrics
          if (isBounce) {
            await supabase.rpc("increment_campaign_bounce", { campaign_id: campaign.id });
          }

          // If critical SMTP error, pause campaign and stop processing
          if (isCriticalError) {
            console.error(`CRITICAL SMTP error for campaign ${campaign.id}: ${emailError.message}`);
            await supabase
              .from("campaigns")
              .update({ status: "paused" })
              .eq("id", campaign.id);
            
            // Mark remaining pending recipients as failed
            await supabase
              .from("campaign_recipients")
              .update({ 
                status: "failed", 
                error_message: `Campaign paused: ${emailError.message}` 
              })
              .eq("campaign_id", campaign.id)
              .eq("status", "pending");
            
            criticalError = true;
            break;
          }
        } finally {
          if (client) {
            try {
              await client.close();
            } catch (closeError) {
              console.warn("Error closing SMTP connection:", closeError);
            }
          }
        }
      }

      // If critical error occurred, don't continue with this campaign
      if (criticalError) {
        console.log(`Campaign ${campaign.id} stopped due to critical error`);
      }
    }

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