import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const targetUrl = url.searchParams.get("url");

  // Default redirect if no URL
  const redirectUrl = targetUrl ? decodeURIComponent(targetUrl) : "https://propscholar.com";

  console.log(`[CLICK TRACK] Request received - tracking_id: ${trackingId}, url: ${redirectUrl}`);

  if (!trackingId) {
    console.log("[CLICK TRACK] No tracking ID, redirecting to default");
    return Response.redirect(redirectUrl, 302);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get recipient by tracking ID
    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, audience_user_id, clicked_at, opened_at, email")
      .eq("tracking_id", trackingId)
      .single();

    if (recipientError || !recipient) {
      console.log(`[CLICK TRACK] Recipient not found for tracking ID: ${trackingId}`, recipientError?.message);
      return Response.redirect(redirectUrl, 302);
    }

    console.log(`[CLICK TRACK] Found recipient: ${recipient.email}, campaign: ${recipient.campaign_id}`);

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

    // Record the click event (always record for analytics)
    const { error: eventError } = await supabase.from("campaign_events").insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      audience_user_id: recipient.audience_user_id,
      event_type: "click",
      link_url: redirectUrl,
      user_agent: userAgent,
      ip_address: ip,
      device_type: deviceType,
    });

    if (eventError) {
      console.error(`[CLICK TRACK] Failed to insert event:`, eventError.message);
    } else {
      console.log(`[CLICK TRACK] Click event recorded for ${recipient.email}`);
    }

    // If user hasn't opened email yet (clicked link in preview), also mark as opened
    if (!recipient.opened_at) {
      await supabase
        .from("campaign_recipients")
        .update({ 
          status: "opened", 
          opened_at: new Date().toISOString() 
        })
        .eq("id", recipient.id);

      // Increment campaign open count
      const { data: campaignForOpen } = await supabase
        .from("campaigns")
        .select("open_count")
        .eq("id", recipient.campaign_id)
        .single();

      if (campaignForOpen) {
        await supabase
          .from("campaigns")
          .update({ open_count: (campaignForOpen.open_count || 0) + 1 })
          .eq("id", recipient.campaign_id);
      }

      console.log(`[CLICK TRACK] Also marked as opened (clicked without tracking pixel load)`);
    }

    // Update recipient if first click AND increment campaign click count
    if (!recipient.clicked_at) {
      const { error: updateError } = await supabase
        .from("campaign_recipients")
        .update({ 
          status: "clicked", 
          clicked_at: new Date().toISOString() 
        })
        .eq("id", recipient.id);

      if (updateError) {
        console.error(`[CLICK TRACK] Failed to update recipient:`, updateError.message);
      } else {
        console.log(`[CLICK TRACK] First click - updated recipient ${recipient.email}`);
      }

      // Increment campaign click count using direct update for reliability
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("click_count")
        .eq("id", recipient.campaign_id)
        .single();

      if (campaign) {
        const { error: campaignError } = await supabase
          .from("campaigns")
          .update({ click_count: (campaign.click_count || 0) + 1 })
          .eq("id", recipient.campaign_id);

        if (campaignError) {
          console.error(`[CLICK TRACK] Failed to update campaign click_count:`, campaignError.message);
        } else {
          console.log(`[CLICK TRACK] Campaign click_count updated to ${(campaign.click_count || 0) + 1}`);
        }
      }

      // Update audience user engagement
      try {
        const { data: audienceUser } = await supabase
          .from("audience_users")
          .select("total_clicks")
          .eq("id", recipient.audience_user_id)
          .single();

        if (audienceUser) {
          await supabase
            .from("audience_users")
            .update({ 
              total_clicks: (audienceUser.total_clicks || 0) + 1,
              last_engaged_at: new Date().toISOString()
            })
            .eq("id", recipient.audience_user_id);
        }
      } catch (e) {
        console.warn(`[CLICK TRACK] Failed to update audience user:`, e);
      }

      console.log(`[CLICK TRACK] FIRST CLICK tracked successfully for ${recipient.email}`);
    } else {
      console.log(`[CLICK TRACK] Repeat click for ${recipient.email} (first click was at ${recipient.clicked_at})`);
    }

  } catch (error: any) {
    console.error("[CLICK TRACK] Error:", error.message);
  }

  console.log(`[CLICK TRACK] Redirecting to: ${redirectUrl}`);
  return Response.redirect(redirectUrl, 302);
};

serve(handler);
