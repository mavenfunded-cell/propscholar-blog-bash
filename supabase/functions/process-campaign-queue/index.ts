import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.12";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SMTP_HOST = "smtp.hostinger.com";
const SMTP_PORT = 465;
const BATCH_SIZE = 25;
const DELAY_BETWEEN_EMAILS_MS = 500;
const MAX_BOUNCE_RATE = 0.05;
const MAX_CONSECUTIVE_FAILURES = 3;

interface SmtpMailbox {
  email: string;
  password: string;
  label: string;
  transporter: any;
  healthy: boolean;
}

// Round-robin counter for true 50/50 distribution
let roundRobinCounter = 0;

function generatePreheaderHtml(preheader: string): string {
  if (!preheader) return "";
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}${"&#8204; &zwnj; ".repeat(30)}</div>`;
}

function isHostingerRateLimit(message: string): boolean {
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("ratelimit") ||
    msg.includes("rate limit") ||
    msg.includes("4.7.1") ||
    msg.includes("hostinger_out_ratelimit") ||
    msg.includes("connection not recoverable") ||
    msg.includes("error while in datamode")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTransporter(email: string, password: string) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: email, pass: password },
    pool: false,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
}

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

    // Build mailbox list
    const mailboxConfigs: { email: string; password: string; label: string }[] = [
      {
        email: Deno.env.get("HOSTINGER_MARKETING_EMAIL") || "",
        password: Deno.env.get("HOSTINGER_MARKETING_PASSWORD") || "",
        label: "marketing",
      },
      {
        email: Deno.env.get("HOSTINGER_HELLO_EMAIL") || "",
        password: Deno.env.get("HOSTINGER_HELLO_PASSWORD") || "",
        label: "hello",
      },
    ];

    const mailboxes: SmtpMailbox[] = mailboxConfigs
      .filter((m) => m.email && m.password)
      .map((m) => ({
        ...m,
        transporter: createTransporter(m.email, m.password),
        healthy: true,
      }));

    if (mailboxes.length === 0) {
      console.error("CRITICAL: No campaign SMTP credentials configured");
      for (const campaign of campaigns) {
        await supabase
          .from("campaigns")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", campaign.id);
      }
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured", failed: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Campaign sending with ${mailboxes.length} mailboxes: ${mailboxes.map(m => m.email).join(", ")}`);

    for (const campaign of campaigns) {
      let consecutiveFailures = 0;
      let criticalError = false;

      // Check bounce rate
      if (campaign.sent_count > 10) {
        const bounceRate = campaign.bounce_count / campaign.sent_count;
        if (bounceRate > MAX_BOUNCE_RATE) {
          await supabase.from("campaigns").update({ status: "paused" }).eq("id", campaign.id);
          console.log(`Campaign ${campaign.id} paused due to high bounce rate: ${(bounceRate * 100).toFixed(1)}%`);
          continue;
        }
      }

      if (campaign.status === "scheduled") {
        await supabase
          .from("campaigns")
          .update({ status: "sending", started_at: new Date().toISOString() })
          .eq("id", campaign.id);
      }

      const trackingBaseUrl = `${supabaseUrl}/functions/v1`;
      const campaignStart = Date.now();
      const MAX_RUNTIME_MS = 55_000;
      let shouldContinue = false;

      while (Date.now() - campaignStart < MAX_RUNTIME_MS) {
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
          break;
        }

        for (const recipient of recipients) {
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            const COOLDOWN_MS = 60_000;
            console.error(`Campaign ${campaign.id}: ${consecutiveFailures} consecutive failures. Cooling down...`);
            await sleep(COOLDOWN_MS);
            shouldContinue = true;
            consecutiveFailures = 0;
            break;
          }

          if (Date.now() - campaignStart >= MAX_RUNTIME_MS) {
            console.log(`Campaign ${campaign.id}: runtime limit reached, will self-invoke`);
            shouldContinue = true;
            break;
          }

          if (!recipient.email || !recipient.email.includes("@")) {
            await supabase
              .from("campaign_recipients")
              .update({ status: "failed", error_message: "Invalid email address" })
              .eq("id", recipient.id);
            continue;
          }

          // Pick mailbox - fall back to healthy one if preferred is down
          const healthyMailboxes = mailboxes.filter((m) => m.healthy);
          if (healthyMailboxes.length === 0) {
            console.error(`Campaign ${campaign.id}: All mailboxes unhealthy, failing campaign`);
            await supabase
              .from("campaigns")
              .update({ status: "failed", completed_at: new Date().toISOString() })
              .eq("id", campaign.id);
            await supabase
              .from("campaign_recipients")
              .update({ status: "failed", error_message: "All SMTP mailboxes failed authentication" })
              .eq("campaign_id", campaign.id)
              .eq("status", "pending");
            criticalError = true;
            break;
          }

          let mbIndex = roundRobinCounter % healthyMailboxes.length;
          roundRobinCounter++;
          const mailbox = healthyMailboxes[mbIndex];

          try {
            // Replace variables
            let html = campaign.html_content;
            html = html.replace(/\{\{first_name\}\}/g, recipient.first_name || "there");
            html = html.replace(/\{\{email\}\}/g, recipient.email);
            html = html.replace(/\{\{subject\}\}/g, campaign.subject);

            // Inject preheader
            if (campaign.preheader) {
              const preheaderHtml = generatePreheaderHtml(campaign.preheader);
              if (/<body[^>]*>/i.test(html)) {
                html = html.replace(/(<body[^>]*>)/i, `$1${preheaderHtml}`);
              } else {
                html = preheaderHtml + html;
              }
            }

            // Tracking pixel
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

            await mailbox.transporter.sendMail({
              from: `${senderName} <${mailbox.email}>`,
              to: recipient.email,
              subject: campaign.subject,
              html,
            });

            await supabase
              .from("campaign_recipients")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", recipient.id);

            await supabase.rpc("increment_campaign_sent", { campaign_id: campaign.id });

            console.log(`Email sent to ${recipient.email} via ${mailbox.label}`);
            consecutiveFailures = 0;

            const delay = DELAY_BETWEEN_EMAILS_MS + Math.random() * 200;
            await sleep(delay);
          } catch (emailError: any) {
            const msg = emailError?.message || String(emailError);
            console.error(`Failed to send to ${recipient.email} via ${mailbox.label}:`, msg);

            // Rate limit - keep pending and cooldown
            if (isHostingerRateLimit(msg)) {
              await supabase
                .from("campaign_recipients")
                .update({ status: "pending", error_message: msg })
                .eq("id", recipient.id);
              const COOLDOWN_MS = 45_000;
              console.log(`Rate limit hit. Cooling down ${Math.round(COOLDOWN_MS / 1000)}s...`);
              await sleep(COOLDOWN_MS);
              shouldContinue = true;
              consecutiveFailures = 0;
              break;
            }

            // Auth failure - mark mailbox as unhealthy, DON'T fail entire campaign
            const isAuthError = msg.includes("535") || msg.toLowerCase().includes("authentication");
            if (isAuthError) {
              console.error(`Mailbox ${mailbox.email} auth failed, marking unhealthy`);
              mailbox.healthy = false;
              // Keep recipient pending so it retries with the other mailbox
              await supabase
                .from("campaign_recipients")
                .update({ status: "pending", error_message: `Auth failed on ${mailbox.label}, will retry` })
                .eq("id", recipient.id);
              consecutiveFailures = 0;
              continue;
            }

            consecutiveFailures++;

            const isBounce =
              msg.includes("550") ||
              msg.toLowerCase().includes("invalid") ||
              msg.toLowerCase().includes("not exist") ||
              msg.toLowerCase().includes("recipient");

            await supabase
              .from("campaign_recipients")
              .update({ status: isBounce ? "bounced" : "failed", error_message: msg })
              .eq("id", recipient.id);

            if (isBounce) {
              await supabase.rpc("increment_campaign_bounce", { campaign_id: campaign.id });
            }

            // Only truly critical: sender rejection
            const isCriticalError =
              msg.includes("553") || msg.toLowerCase().includes("sender");

            if (isCriticalError) {
              console.error(`CRITICAL SMTP error for campaign ${campaign.id}: ${msg}`);
              await supabase
                .from("campaigns")
                .update({ status: "failed", completed_at: new Date().toISOString() })
                .eq("id", campaign.id);
              await supabase
                .from("campaign_recipients")
                .update({ status: "failed", error_message: `Campaign failed: ${msg}` })
                .eq("campaign_id", campaign.id)
                .eq("status", "pending");
              criticalError = true;
              break;
            }
          }
        }

        if (criticalError || shouldContinue) break;
      }

      if (criticalError) {
        console.log(`Campaign ${campaign.id} stopped due to critical error`);
      }

      // Self-invoke to continue
      if (shouldContinue && !criticalError) {
        console.log(`Self-invoking to continue campaign ${campaign.id}...`);
        EdgeRuntime.waitUntil((async () => {
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
            console.error("Failed to self-invoke:", err);
          }
        })());
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
