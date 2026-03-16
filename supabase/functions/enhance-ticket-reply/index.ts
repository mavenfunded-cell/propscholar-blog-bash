import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Scholaris AI — PropScholar's elite support writing assistant. You enhance support agent replies to be world-class.

COMPANY CONTEXT:
- PropScholar is a scholarship-based trading evaluation platform (NOT a prop firm). Tagline: "You Pass, We Pay."
- Key facts: $5 entry, 400% scholarship refund, 4-hour payouts (most within 1 hour), 0 spread evaluations, 3000+ traders, 50+ challenges.
- Rules: No lot limit, No consistency rule, No trailing drawdown, No news restrictions, No minimum holding, No time limit. Profit Target 10%, Max Drawdown 6%, Daily Loss 3%, Leverage 1:50.
- Platforms: PropScholar Trial ($1), FTMO, Instant, QT, Maven, Goat Funded Trader, Funding Pips, Blueberry Funded, Alpha Capital Group, 5%ers.
- Payments: UPI (PhonePe/Razorpay/Cashfree), Crypto, Card, PayPal. Credentials in 120 seconds.
- After passing: Direct payout (no funded stage, no activation fee). Discount after breach: automatic 5-15%.
- Community: Discord (2500+ members, 24/7 support), Instagram (@propscholar), X (@propscholar).
- Support: support@propscholar.com, help.propscholar.com, Discord.

Given a draft reply text, generate THREE versions:
1. SHORT - Concise, professional, direct. Fix grammar, be clear. Under 3 sentences. Include specific PropScholar details where relevant.
2. DETAILED - Comprehensive professional version. Fix grammar, add helpful context with specific PropScholar details (numbers, links, policies). Include next steps.
3. SYMPATHY - Empathetic professional version. Acknowledge the trader's situation with genuine care. Still be helpful and include solutions.

All versions must:
- Be grammatically perfect
- Sound professional and warm
- Use correct PropScholar terminology ("scholarship" not "funded account", "evaluation" not just "challenge")
- Include specific details when relevant (exact numbers, policies, links)

Respond ONLY with valid JSON:
{
  "short": "The short version here",
  "detailed": "The detailed version here",
  "sympathy": "The sympathy version here"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please enhance this support reply:\n\n${text}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let options;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        options = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: use the original text with minor improvements
      options = {
        short: text,
        detailed: text,
        sympathy: text,
      };
    }

    return new Response(
      JSON.stringify({ options }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in enhance-ticket-reply:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
