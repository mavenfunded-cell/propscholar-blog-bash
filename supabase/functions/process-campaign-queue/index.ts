import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const BATCH_SIZE = 20; // Increased from 10
const DELAY_BETWEEN_EMAILS_MS = 500; // Reduced from 2000ms to 500ms
const MAX_BOUNCE_RATE = 0.05;

// Generate preheader HTML that shows as preview text in email clients
function generatePreheaderHtml(preheader: string): string {
  if (!preheader) return "";
  // Hidden preheader text with zero-width spacing to prevent showing in email body
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}${"&#8204; &zwnj; ".repeat(30)}</div>`;
}
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

      const trackingBaseUrl = `${supabaseUrl}/functions/v1`;

      // Process recipients in a loop so the campaign doesn't get stuck in "sending"
      // (edge functions are short-lived, so we stop when we near the runtime limit)
      const campaignStart = Date.now();
      const MAX_RUNTIME_MS = 50_000; // 50 seconds to leave time for self-invoke
      let shouldContinue = false;

      while (Date.now() - campaignStart < MAX_RUNTIME_MS) {
        // Get pending recipients (batch)
        const { data: recipients, error: recipientError } = await supabase
          .from("campaign_recipients")
          .select("*")
          .eq("campaign_id", campaign.id)
          .eq("status", "pending")
          .limit(BATCH_SIZE);

        if (recipientError) throw recipientError;

        // No more recipients => campaign complete
        if (!recipients?.length) {
          await supabase
            .from("campaigns")
            .update({ status: "sent", completed_at: new Date().toISOString() })
            .eq("id", campaign.id);
          console.log(`Campaign ${campaign.id} completed`);
          break;
        }

        // Send emails
        for (const recipient of recipients) {
          // Stop if we hit too many consecutive failures
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error(
              `Campaign ${campaign.id}: Too many consecutive failures (${consecutiveFailures}), pausing...`
            );
            await supabase
              .from("campaigns")
              .update({ status: "paused" })
              .eq("id", campaign.id);
            criticalError = true;
            break;
          }

          // Stop if we're near runtime limit - flag for continuation
          if (Date.now() - campaignStart >= MAX_RUNTIME_MS) {
            console.log(`Campaign ${campaign.id}: runtime limit reached, will self-invoke to continue`);
            shouldContinue = true;
            break;
          }

          // Skip if recipient has empty/invalid email
          if (!recipient.email || !recipient.email.includes("@")) {
            console.warn(`Skipping recipient with invalid email: ${recipient.email}`);
            await supabase
              .from("campaign_recipients")
              .update({ status: "failed", error_message: "Invalid email address" })
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

            // Inject preheader right after <body> tag
            if (campaign.preheader) {
              const preheaderHtml = generatePreheaderHtml(campaign.preheader);
              if (/<body[^>]*>/i.test(html)) {
                html = html.replace(/(<body[^>]*>)/i, `$1${preheaderHtml}`);
              } else {
                // If no body tag, prepend to content
                html = preheaderHtml + html;
              }
            }

            // Add tracking pixel (robust to missing/uppercase </body>)
            const trackingPixel = `<img src="${trackingBaseUrl}/track-campaign-open?t=${recipient.tracking_id}" width="1" height="1" style="display:none;" />`;
            if (/<\/body>/i.test(html)) {
              html = html.replace(/<\/body>/i, `${trackingPixel}</body>`);
            } else {
              html = `${html}${trackingPixel}`;
            }

            // Replace links with tracking links
            html = html.replace(/href="([^"]+)"/g, (match: string, linkUrl: string) => {
              if (linkUrl.includes("unsubscribe") || linkUrl === "#") {
                return `href="${trackingBaseUrl}/campaign-unsubscribe?t=${recipient.tracking_id}"`;
              }
              const encodedUrl = encodeURIComponent(linkUrl);
              return `href="${trackingBaseUrl}/track-campaign-click?t=${recipient.tracking_id}&url=${encodedUrl}"`;
            });

            const senderName = campaign.sender_name || "PropScholar";

            await client.send({
              from: `${senderName} <${senderEmail}>`,
              to: recipient.email,
              subject: campaign.subject,
              html,
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

            // Add small delay to avoid rate limits
            const delay = DELAY_BETWEEN_EMAILS_MS + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, delay));
          } catch (emailError: any) {
            console.error(`Failed to send to ${recipient.email}:`, emailError?.message || emailError);
            consecutiveFailures++;

            const msg = emailError?.message || String(emailError);

            // Critical SMTP errors (stop the campaign)
            const isCriticalError =
              msg.includes("535") ||
              msg.toLowerCase().includes("authentication") ||
              msg.includes("553") ||
              msg.toLowerCase().includes("sender") ||
              msg.toLowerCase().includes("connection") ||
              msg.toLowerCase().includes("ehlo") ||
              msg.toLowerCase().includes("timed out");

            // Bounce-type errors (recipient issue)
            const isBounce =
              msg.includes("550") ||
              msg.toLowerCase().includes("invalid") ||
              msg.toLowerCase().includes("not exist") ||
              msg.toLowerCase().includes("recipient");

            await supabase
              .from("campaign_recipients")
              .update({
                status: isBounce ? "bounced" : "failed",
                error_message: msg,
              })
              .eq("id", recipient.id);

            if (isBounce) {
              await supabase.rpc("increment_campaign_bounce", { campaign_id: campaign.id });
            }

            if (isCriticalError) {
              console.error(`CRITICAL SMTP error for campaign ${campaign.id}: ${msg}`);
              await supabase
                .from("campaigns")
                .update({ status: "failed", completed_at: new Date().toISOString() })
                .eq("id", campaign.id);

              await supabase
                .from("campaign_recipients")
                .update({
                  status: "failed",
                  error_message: `Campaign failed: ${msg}`,
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

        if (criticalError || shouldContinue) break;
      }

      if (criticalError) {
        console.log(`Campaign ${campaign.id} stopped due to critical error`);
      }

      // Self-invoke to continue processing if we hit runtime limit
      if (shouldContinue && !criticalError) {
        console.log(`Self-invoking to continue campaign ${campaign.id}...`);
        // Use EdgeRuntime.waitUntil for background continuation
        const continueProcessing = async () => {
          try {
            const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/process-campaign-queue`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${anonKey}`,
              },
              body: JSON.stringify({ continue: true }),
            });
            console.log("Continuation request sent successfully");
          } catch (err) {
            console.error("Failed to self-invoke for continuation:", err);
          }
        };
        
        // Fire and forget - don't await
        EdgeRuntime.waitUntil(continueProcessing());
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