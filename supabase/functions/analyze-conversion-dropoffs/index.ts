import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get data for analysis
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get abandoned carts with reasons
    const { data: abandonedCarts } = await supabase
      .from("abandoned_carts")
      .select("drop_off_reason, cart_value, cart_items, checkout_started")
      .gte("created_at", sevenDaysAgo.toISOString())
      .eq("recovered", false);

    // Get drop-off events by page
    const { data: dropoffEvents } = await supabase
      .from("conversion_events")
      .select("page_url, event_type, time_on_page_seconds, metadata")
      .eq("event_type", "checkout_abandoned")
      .gte("timestamp", sevenDaysAgo.toISOString());

    // Get conversion events
    const { data: conversionEvents } = await supabase
      .from("conversion_events")
      .select("event_type")
      .in("event_type", ["purchase_completed", "checkout_started", "add_to_cart"])
      .gte("timestamp", sevenDaysAgo.toISOString());

    // Calculate metrics
    const totalAbandoned = abandonedCarts?.length || 0;
    const totalAddToCart = conversionEvents?.filter(e => e.event_type === "add_to_cart").length || 0;
    const totalCheckoutStarted = conversionEvents?.filter(e => e.event_type === "checkout_started").length || 0;
    const totalPurchases = conversionEvents?.filter(e => e.event_type === "purchase_completed").length || 0;

    // Drop-off reasons breakdown
    const reasonCounts: Record<string, number> = {};
    abandonedCarts?.forEach(cart => {
      const reason = cart.drop_off_reason || "unknown";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    // Page drop-off analysis
    const pageDropoffs: Record<string, number> = {};
    dropoffEvents?.forEach(event => {
      const url = event.page_url || "unknown";
      const path = new URL(url).pathname;
      pageDropoffs[path] = (pageDropoffs[path] || 0) + 1;
    });

    // Average time before abandonment
    const avgTimeBeforeAbandon = dropoffEvents?.length 
      ? dropoffEvents.reduce((sum, e) => sum + (e.time_on_page_seconds || 0), 0) / dropoffEvents.length
      : 0;

    // Cart value analysis
    const cartValues = abandonedCarts?.map(c => c.cart_value || 0) || [];
    const avgCartValue = cartValues.length ? cartValues.reduce((a, b) => a + b, 0) / cartValues.length : 0;

    // Product analysis
    const productAbandons: Record<string, number> = {};
    abandonedCarts?.forEach(cart => {
      const items = cart.cart_items as Array<{ product_name?: string; account_size?: string }> || [];
      items.forEach(item => {
        const key = `${item.product_name || "Unknown"} - ${item.account_size || "N/A"}`;
        productAbandons[key] = (productAbandons[key] || 0) + 1;
      });
    });

    // Generate insights using AI
    const insights: Array<{ type: string; text: string; severity: string; metric?: number; label?: string }> = [];

    if (LOVABLE_API_KEY) {
      const analysisPrompt = `Analyze this e-commerce conversion data and provide 3-5 actionable insights in plain English. Be specific and direct.

Data:
- Total abandoned carts: ${totalAbandoned}
- Add to cart: ${totalAddToCart}
- Checkout started: ${totalCheckoutStarted}
- Purchases: ${totalPurchases}
- Cart-to-purchase rate: ${totalAddToCart > 0 ? ((totalPurchases / totalAddToCart) * 100).toFixed(1) : 0}%
- Average cart value: $${avgCartValue.toFixed(2)}
- Average time before abandonment: ${Math.round(avgTimeBeforeAbandon)} seconds

Drop-off reasons:
${Object.entries(reasonCounts).map(([reason, count]) => `- ${reason}: ${count}`).join("\n")}

Page drop-offs:
${Object.entries(pageDropoffs).slice(0, 5).map(([page, count]) => `- ${page}: ${count}`).join("\n")}

Most abandoned products:
${Object.entries(productAbandons).slice(0, 5).map(([product, count]) => `- ${product}: ${count}`).join("\n")}

Return ONLY a JSON array of insights like:
[{"type": "dropoff", "text": "Your insight here", "severity": "warning"}]

Types: dropoff, conversion, pricing, friction, trust
Severities: info, warning, critical`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a conversion optimization expert. Return only valid JSON arrays." },
              { role: "user", content: analysisPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          
          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiInsights = JSON.parse(jsonMatch[0]);
            insights.push(...aiInsights);
          }
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }
    }

    // Add rule-based insights if AI didn't provide enough
    if (insights.length < 3) {
      // Top drop-off reason
      const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
      if (topReason) {
        const reasonTexts: Record<string, string> = {
          price_hesitation: "Users are hesitating on pricing. Consider adding more value justification or payment plans.",
          trust_concern: "Users are checking FAQs before leaving - there may be trust or clarity issues.",
          payment_friction: "Drop-offs happening at payment stage. Check for UX issues or payment method options.",
          decision_hesitation: "Users spending a long time before abandoning - they need more convincing.",
          distraction: "Quick exits suggest users are comparison shopping or got distracted."
        };
        insights.push({
          type: "dropoff",
          text: reasonTexts[topReason[0]] || `Most common drop-off reason: ${topReason[0]} (${topReason[1]} carts)`,
          severity: topReason[1] > 10 ? "warning" : "info",
          metric: topReason[1],
          label: "carts"
        });
      }

      // Conversion rate insight
      if (totalAddToCart > 0) {
        const conversionRate = (totalPurchases / totalAddToCart) * 100;
        insights.push({
          type: "conversion",
          text: conversionRate < 5 
            ? `Only ${conversionRate.toFixed(1)}% of add-to-carts convert. Focus on checkout optimization.`
            : `${conversionRate.toFixed(1)}% cart-to-purchase rate. ${conversionRate > 15 ? "Good" : "Room for improvement"}.`,
          severity: conversionRate < 5 ? "critical" : conversionRate < 10 ? "warning" : "info",
          metric: conversionRate,
          label: "conversion rate"
        });
      }

      // Average time insight
      if (avgTimeBeforeAbandon > 0) {
        insights.push({
          type: "friction",
          text: avgTimeBeforeAbandon > 90 
            ? `Users spend ${Math.round(avgTimeBeforeAbandon)}s before abandoning. They're interested but something's stopping them.`
            : `Quick abandonment (${Math.round(avgTimeBeforeAbandon)}s avg) - initial friction or price shock.`,
          severity: avgTimeBeforeAbandon > 120 ? "warning" : "info",
          metric: avgTimeBeforeAbandon,
          label: "seconds"
        });
      }
    }

    // Save insights to database
    await supabase.from("conversion_insights").update({ is_active: false }).eq("is_active", true);

    for (const insight of insights) {
      await supabase.from("conversion_insights").insert({
        insight_type: insight.type,
        insight_text: insight.text,
        severity: insight.severity,
        metric_value: insight.metric,
        metric_label: insight.label,
        date_range_start: sevenDaysAgo.toISOString(),
        date_range_end: now.toISOString(),
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      insights_generated: insights.length,
      summary: {
        total_abandoned: totalAbandoned,
        total_purchases: totalPurchases,
        avg_cart_value: avgCartValue,
        top_reason: Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
