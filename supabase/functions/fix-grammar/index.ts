import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text?.trim()) return new Response(JSON.stringify({ fixed: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        stream: false,
        messages: [
          {
            role: "system",
            content: "You are a grammar fixer. Fix ONLY grammar, spelling, and punctuation errors in the text. Do NOT change the meaning, tone, style, or add new content. Keep the same language/register. Return ONLY the corrected text, nothing else. No explanations."
          },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("Raw response:", rawText.substring(0, 500));
      throw new Error("Invalid response from AI gateway");
    }
    const fixed = data.choices?.[0]?.message?.content || text;

    return new Response(JSON.stringify({ fixed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Grammar fix error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
