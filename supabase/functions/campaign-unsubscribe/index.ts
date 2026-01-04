import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");

  const htmlResponse = (message: string, success: boolean) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribe - PropScholar</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 40px 20px;
          background: #0f0f23;
          color: #fff;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          max-width: 500px;
          text-align: center;
          background: #1a1a2e;
          padding: 40px;
          border-radius: 16px;
          border: 1px solid #2a2a4a;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          margin: 0 0 16px;
          font-size: 24px;
        }
        p {
          color: #888;
          margin: 0 0 24px;
          line-height: 1.6;
        }
        a {
          color: #6366f1;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${success ? '✓' : '⚠️'}</div>
        <h1>${message}</h1>
        <p>${success 
          ? "You've been successfully unsubscribed from our marketing emails. You will no longer receive promotional messages from us."
          : "We couldn't process your unsubscribe request. The link may be invalid or expired."
        }</p>
        <p><a href="https://propscholar.com">Return to PropScholar</a></p>
      </div>
    </body>
    </html>
  `;

  if (!trackingId) {
    return new Response(htmlResponse("Invalid Link", false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get recipient by tracking ID
    const { data: recipient, error: recipientError } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, audience_user_id, email")
      .eq("tracking_id", trackingId)
      .single();

    if (recipientError || !recipient) {
      return new Response(htmlResponse("Invalid Link", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Mark audience user as unsubscribed
    await supabase
      .from("audience_users")
      .update({ 
        is_marketing_allowed: false,
        unsubscribed_at: new Date().toISOString() 
      })
      .eq("id", recipient.audience_user_id);

    // Record unsubscribe event
    await supabase.from("campaign_events").insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      audience_user_id: recipient.audience_user_id,
      event_type: "unsubscribe",
    });

    // Increment campaign unsubscribe count
    await supabase.rpc("increment_campaign_unsubscribe", { 
      campaign_id: recipient.campaign_id 
    });

    console.log(`User ${recipient.email} unsubscribed`);

    return new Response(htmlResponse("Unsubscribed Successfully", true), {
      headers: { "Content-Type": "text/html" },
    });

  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return new Response(htmlResponse("Something Went Wrong", false), {
      headers: { "Content-Type": "text/html" },
    });
  }
};

serve(handler);
