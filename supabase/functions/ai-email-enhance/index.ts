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
    const { prompt, systemPrompt, emailContent, subject, action, fullHtml } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let finalSystemPrompt = systemPrompt;
    let userMessage = "";

    // Handle code editing actions
    if (action === 'edit_code' && fullHtml) {
      finalSystemPrompt = `You are an expert email HTML developer specializing in responsive email templates. 
You work for PropScholar, a prop trading education platform.

CRITICAL RULES:
1. Return ONLY the complete modified HTML code - no explanations, no markdown, no code blocks.
2. Preserve all existing structure, styles, and content unless explicitly asked to change them.
3. Keep all personalization variables like {{first_name}}, {{email}}, {{unsubscribe_url}} intact.
4. Ensure all changes are email-client compatible (inline styles, table-based layouts where needed).
5. Maintain responsive design principles.
6. Use PropScholar brand colors: primary gold (#D4AF37), dark backgrounds, professional styling.

When asked to:
- "Change colors" - Update color values in style attributes
- "Edit header" - Modify the header section while keeping structure
- "Update button" - Change button text, colors, or styling
- "Make mobile-friendly" - Add responsive styles and media queries
- "Clean up HTML" - Remove unnecessary whitespace, optimize code
- "Convert to template" - Restructure content into requested template format

Return the complete HTML document with your changes applied.`;

      userMessage = `Current email subject: ${subject}

Current HTML:
${emailContent}

Requested change: ${prompt}

Return the complete modified HTML:`;
    } else {
      // Original text enhancement mode
      userMessage = `
Action requested: ${action}
Instruction: ${prompt}

Current email subject: ${subject}
Current email content:
${emailContent}

Please provide your enhanced version or suggestions. Be specific and actionable.
If suggesting subject lines, provide 3 options numbered.
If improving copy, provide the complete improved text.
Keep responses concise and ready to use.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage },
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
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-email-enhance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
