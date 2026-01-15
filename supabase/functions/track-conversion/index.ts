import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TrackingPayload {
  anonymous_id: string;
  session_id: string;
  event_type: string;
  page_url: string;
  page_title?: string;
  timestamp: string;
  time_on_page_seconds?: number;
  referrer?: string;
  user_agent?: string;
  user_email?: string;
  metadata?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: TrackingPayload = await req.json();
    const { anonymous_id, session_id, event_type, page_url, page_title, timestamp, time_on_page_seconds, referrer, user_agent, user_email, metadata } = payload;

    if (!anonymous_id || !event_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get IP and geo (simplified)
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown";

    // Upsert session
    const { data: existingSession } = await supabase
      .from("conversion_sessions")
      .select("id, total_page_views, total_time_seconds")
      .eq("anonymous_id", anonymous_id)
      .maybeSingle();

    let sessionDbId: string;

    if (!existingSession) {
      const { data: newSession, error: sessionError } = await supabase
        .from("conversion_sessions")
        .insert({
          anonymous_id,
          user_email: user_email || null,
          user_agent,
          referrer,
          landing_page: page_url,
        })
        .select("id")
        .single();

      if (sessionError) {
        console.error("Session insert error:", sessionError);
        throw sessionError;
      }
      sessionDbId = newSession.id;
    } else {
      sessionDbId = existingSession.id;
      
      // Update session
      const updates: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        total_page_views: (existingSession.total_page_views || 0) + (event_type === "page_viewed" ? 1 : 0),
        total_time_seconds: (existingSession.total_time_seconds || 0) + (time_on_page_seconds || 0),
      };

      if (user_email) {
        updates.user_email = user_email;
      }

      if (event_type === "purchase_completed") {
        updates.converted = true;
        updates.converted_at = new Date().toISOString();
      }

      await supabase
        .from("conversion_sessions")
        .update(updates)
        .eq("id", sessionDbId);
    }

    // Insert event
    await supabase.from("conversion_events").insert({
      session_id: sessionDbId,
      anonymous_id,
      event_type,
      page_url,
      page_title,
      timestamp,
      time_on_page_seconds,
      metadata: metadata || {},
    });

    // Handle cart events
    if (event_type === "add_to_cart" && metadata) {
      await supabase.from("cart_items").insert({
        session_id: sessionDbId,
        anonymous_id,
        product_name: metadata.product_name as string,
        account_size: metadata.account_size as string,
        price: metadata.price as number,
        discount_applied: metadata.discount_applied as number || 0,
        platform_type: metadata.platform_type as string,
      });
    }

    if (event_type === "remove_from_cart" && metadata) {
      await supabase
        .from("cart_items")
        .update({ removed_at: new Date().toISOString() })
        .eq("session_id", sessionDbId)
        .eq("product_name", metadata.product_name as string)
        .is("removed_at", null);
    }

    // Handle checkout started
    if (event_type === "checkout_started" && metadata) {
      const cartItems = metadata.cart_items as Array<Record<string, unknown>> || [];
      const cartValue = metadata.cart_value as number || 0;

      // Check for existing abandoned cart
      const { data: existingCart } = await supabase
        .from("abandoned_carts")
        .select("id")
        .eq("session_id", sessionDbId)
        .eq("recovered", false)
        .maybeSingle();

      if (existingCart) {
        await supabase
          .from("abandoned_carts")
          .update({
            checkout_started: true,
            checkout_started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            cart_items: cartItems,
            cart_value: cartValue,
            user_email: user_email || null,
          })
          .eq("id", existingCart.id);
      } else {
        await supabase.from("abandoned_carts").insert({
          session_id: sessionDbId,
          anonymous_id,
          user_email: user_email || null,
          cart_value: cartValue,
          cart_items: cartItems,
          checkout_started: true,
          checkout_started_at: new Date().toISOString(),
        });
      }
    }

    // Handle checkout abandoned
    if (event_type === "checkout_abandoned" && metadata) {
      const cartItems = metadata.cart_items as Array<Record<string, unknown>> || [];
      const cartValue = metadata.cart_value as number || 0;
      const reason = metadata.reason as string || "unknown";
      const timeOnPage = metadata.time_on_page_seconds as number || 0;

      // Determine drop-off reason based on behavior
      let dropOffReason = "unknown";
      if (reason === "page_exit" && timeOnPage < 30) {
        dropOffReason = "distraction";
      } else if (timeOnPage > 90) {
        dropOffReason = "decision_hesitation";
      } else if (page_url.includes("payment") || page_url.includes("checkout")) {
        dropOffReason = "payment_friction";
      } else {
        dropOffReason = "price_hesitation";
      }

      // Check scroll behavior for trust concerns
      const { data: scrollEvents } = await supabase
        .from("conversion_events")
        .select("metadata")
        .eq("session_id", sessionDbId)
        .eq("event_type", "scroll_depth")
        .order("timestamp", { ascending: false })
        .limit(10);

      const visitedFaq = scrollEvents?.some(e => 
        (e.metadata as Record<string, unknown>)?.page_url?.toString().includes("faq") ||
        (e.metadata as Record<string, unknown>)?.page_url?.toString().includes("rules")
      );

      if (visitedFaq) {
        dropOffReason = "trust_concern";
      }

      const { data: existingCart } = await supabase
        .from("abandoned_carts")
        .select("id")
        .eq("session_id", sessionDbId)
        .eq("recovered", false)
        .maybeSingle();

      if (existingCart) {
        await supabase
          .from("abandoned_carts")
          .update({
            abandoned_at: new Date().toISOString(),
            recovery_status: "pending",
            drop_off_reason: dropOffReason,
            cart_items: cartItems,
            cart_value: cartValue,
            user_email: user_email || null,
          })
          .eq("id", existingCart.id);
      } else {
        await supabase.from("abandoned_carts").insert({
          session_id: sessionDbId,
          anonymous_id,
          user_email: user_email || null,
          cart_value: cartValue,
          cart_items: cartItems,
          abandoned_at: new Date().toISOString(),
          recovery_status: "pending",
          drop_off_reason: dropOffReason,
        });
      }
    }

    // Handle purchase completed
    if (event_type === "purchase_completed") {
      // Mark cart items as purchased
      await supabase
        .from("cart_items")
        .update({ purchased: true, purchased_at: new Date().toISOString() })
        .eq("session_id", sessionDbId)
        .is("purchased", false);

      // Mark abandoned cart as recovered
      await supabase
        .from("abandoned_carts")
        .update({ recovered: true, recovered_at: new Date().toISOString(), recovery_status: "converted" })
        .eq("session_id", sessionDbId)
        .eq("recovered", false);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tracking error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
