import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
]);

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");

  console.log(`[OPEN TRACK] Request received with tracking_id: ${trackingId}`);

  if (!trackingId) {
    console.log("[OPEN TRACK] No tracking ID provided");
    return new Response(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get recipient by tracking ID
    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, audience_user_id, opened_at, email")
      .eq("tracking_id", trackingId)
      .single();

    if (recipientError || !recipient) {
      console.log(`[OPEN TRACK] Recipient not found for tracking ID: ${trackingId}`, recipientError?.message);
      return new Response(TRACKING_PIXEL, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    console.log(`[OPEN TRACK] Found recipient: ${recipient.email}, campaign: ${recipient.campaign_id}`);

    // Get user agent and IP for analytics
    const userAgent = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || 
               req.headers.get("x-real-ip") || "";

    // Detect device type
    let deviceType = "desktop";
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      deviceType = "mobile";
    } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
      deviceType = "tablet";
    }

    // Record the open event (always record for analytics)
    const { error: eventError } = await supabase.from("campaign_events").insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      audience_user_id: recipient.audience_user_id,
      event_type: "open",
      user_agent: userAgent,
      ip_address: ip,
      device_type: deviceType,
    });

    if (eventError) {
      console.error(`[OPEN TRACK] Failed to insert event:`, eventError.message);
    } else {
      console.log(`[OPEN TRACK] Event recorded for ${recipient.email}`);
    }

    // Update recipient if first open AND increment campaign open count
    if (!recipient.opened_at) {
      const { error: updateError } = await supabase
        .from("campaign_recipients")
        .update({ 
          status: "opened", 
          opened_at: new Date().toISOString() 
        })
        .eq("id", recipient.id);

      if (updateError) {
        console.error(`[OPEN TRACK] Failed to update recipient:`, updateError.message);
      } else {
        console.log(`[OPEN TRACK] First open - updated recipient ${recipient.email}`);
      }

      // Increment campaign open count using direct update for reliability
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("open_count")
        .eq("id", recipient.campaign_id)
        .single();

      if (campaign) {
        const { error: campaignError } = await supabase
          .from("campaigns")
          .update({ open_count: (campaign.open_count || 0) + 1 })
          .eq("id", recipient.campaign_id);

        if (campaignError) {
          console.error(`[OPEN TRACK] Failed to update campaign open_count:`, campaignError.message);
        } else {
          console.log(`[OPEN TRACK] Campaign open_count updated to ${(campaign.open_count || 0) + 1}`);
        }
      }

      // Update audience user engagement
      try {
        const { data: audienceUser } = await supabase
          .from("audience_users")
          .select("total_opens")
          .eq("id", recipient.audience_user_id)
          .single();

        if (audienceUser) {
          await supabase
            .from("audience_users")
            .update({ 
              total_opens: (audienceUser.total_opens || 0) + 1,
              last_engaged_at: new Date().toISOString()
            })
            .eq("id", recipient.audience_user_id);
        }
      } catch (e) {
        console.warn(`[OPEN TRACK] Failed to update audience user:`, e);
      }

      console.log(`[OPEN TRACK] FIRST OPEN tracked successfully for ${recipient.email}`);
    } else {
      console.log(`[OPEN TRACK] Repeat open for ${recipient.email} (first open was at ${recipient.opened_at})`);
    }

  } catch (error: any) {
    console.error("[OPEN TRACK] Error:", error.message);
  }

  return new Response(TRACKING_PIXEL, {
    headers: { 
      "Content-Type": "image/gif", 
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    },
  });
};

serve(handler);
