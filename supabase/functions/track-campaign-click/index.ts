import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const targetUrl = url.searchParams.get("url");

  // Default redirect if no URL
  const redirectUrl = targetUrl ? decodeURIComponent(targetUrl) : "https://propscholar.com";

  if (!trackingId) {
    return Response.redirect(redirectUrl, 302);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get recipient by tracking ID
    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, audience_user_id, clicked_at")
      .eq("tracking_id", trackingId)
      .single();

    if (recipientError || !recipient) {
      console.log("Recipient not found for tracking ID:", trackingId);
      return Response.redirect(redirectUrl, 302);
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

    // Record the click event
    await supabase.from("campaign_events").insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      audience_user_id: recipient.audience_user_id,
      event_type: "click",
      link_url: redirectUrl,
      user_agent: userAgent,
      ip_address: ip,
      device_type: deviceType,
    });

    // Update recipient if first click
    if (!recipient.clicked_at) {
      await supabase
        .from("campaign_recipients")
        .update({ 
          status: "clicked", 
          clicked_at: new Date().toISOString() 
        })
        .eq("id", recipient.id);

      // Increment campaign click count
      await supabase.rpc("increment_campaign_click", { 
        campaign_id: recipient.campaign_id 
      });

      // Update audience user engagement
      await supabase.rpc("increment_audience_clicks", { 
        user_id: recipient.audience_user_id 
      });
    }

    console.log(`Click tracked for recipient ${recipient.id}, URL: ${redirectUrl}`);

  } catch (error) {
    console.error("Error tracking click:", error);
  }

  return Response.redirect(redirectUrl, 302);
};

serve(handler);
