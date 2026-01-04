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

  if (!trackingId) {
    return new Response(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get recipient by tracking ID
    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, audience_user_id, opened_at")
      .eq("tracking_id", trackingId)
      .single();

    if (recipientError || !recipient) {
      console.log("Recipient not found for tracking ID:", trackingId);
      return new Response(TRACKING_PIXEL, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
      });
    }

    // Get user agent and IP for analytics
    const userAgent = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("cf-connecting-ip") || "";

    // Detect device type
    let deviceType = "desktop";
    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      deviceType = /ipad|tablet/i.test(userAgent) ? "tablet" : "mobile";
    }

    // Record the open event
    await supabase.from("campaign_events").insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      audience_user_id: recipient.audience_user_id,
      event_type: "open",
      user_agent: userAgent,
      ip_address: ip,
      device_type: deviceType,
    });

    // Update recipient if first open
    if (!recipient.opened_at) {
      await supabase
        .from("campaign_recipients")
        .update({ 
          status: "opened", 
          opened_at: new Date().toISOString() 
        })
        .eq("id", recipient.id);

      // Increment campaign open count
      await supabase.rpc("increment_campaign_open", { 
        campaign_id: recipient.campaign_id 
      });

      // Update audience user engagement
      await supabase.rpc("increment_audience_opens", { 
        user_id: recipient.audience_user_id 
      });
    }

    console.log(`Open tracked for recipient ${recipient.id}`);

  } catch (error) {
    console.error("Error tracking open:", error);
  }

  return new Response(TRACKING_PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
};

serve(handler);
