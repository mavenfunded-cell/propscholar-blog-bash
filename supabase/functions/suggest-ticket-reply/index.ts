import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    const { ticketId, conversationHistory, adminId } = await req.json();
    console.log("Generating AI suggestions for ticket:", ticketId, "by admin:", adminId);

    if (!adminId) {
      throw new Error("Admin ID is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get rate limit settings
    const { data: rateLimitSettings } = await supabase
      .from("reward_settings")
      .select("setting_value")
      .eq("setting_key", "ai_rate_limit")
      .single();

    const requestsPerHour = rateLimitSettings?.setting_value?.requests_per_hour || 10;
    const rateLimitEnabled = rateLimitSettings?.setting_value?.enabled !== false;

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: requestCount } = await supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("admin_id", adminId)
      .gte("created_at", oneHourAgo);

    const currentCount = requestCount || 0;
    const requestsRemaining = Math.max(0, requestsPerHour - currentCount);

    if (rateLimitEnabled && currentCount >= requestsPerHour) {
      // Log rate limited request
      await supabase.from("ai_usage_logs").insert({
        admin_id: adminId,
        ticket_id: ticketId,
        request_type: "suggest-ticket-reply",
        tokens_estimated: 0,
        status: "rate_limited",
        error_message: "Rate limit exceeded",
      });

      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please wait before making more AI requests.",
        requests_remaining: 0,
        requests_per_hour: requestsPerHour
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch knowledge base entries
    const { data: knowledgeBase } = await supabase
      .from("ai_knowledge_base")
      .select("title, content, category")
      .eq("is_active", true);

    // Fetch canned messages for context
    const { data: cannedMessages } = await supabase
      .from("canned_messages")
      .select("title, content, category");

    // Build knowledge context
    const knowledgeContext = knowledgeBase?.map(kb => 
      `[${kb.category}] ${kb.title}: ${kb.content}`
    ).join("\n") || "";

    const cannedContext = cannedMessages?.map(cm =>
      `- ${cm.title} (${cm.category}): "${cm.content}"`
    ).join("\n") || "";

    // Build conversation context
    const conversationContext = conversationHistory?.map((msg: any) => 
      `${msg.sender_type === 'user' ? 'Customer' : 'Support'}: ${msg.body}`
    ).join("\n") || "";

    const systemPrompt = `You are an AI assistant helping PropScholar support agents craft professional responses. 

KNOWLEDGE BASE:
${knowledgeContext}

AVAILABLE CANNED RESPONSES (for reference):
${cannedContext}

YOUR TASK:
1. Analyze the customer's message and conversation history
2. Generate 3 suggested replies that are:
   - Professional and friendly
   - Helpful and solution-oriented
   - Concise but complete
   - Personalized to the specific issue
3. Learn from the conversation patterns and adapt your suggestions

Return ONLY a JSON array with exactly 3 suggestions in this format:
[
  {"type": "quick", "content": "A brief, direct response"},
  {"type": "detailed", "content": "A more comprehensive response with explanation"},
  {"type": "empathetic", "content": "A warm, understanding response focusing on customer care"}
]

Do not include any other text, just the JSON array.`;

    // Estimate tokens (rough estimate: 4 chars per token)
    const promptLength = systemPrompt.length + conversationContext.length;
    const estimatedTokens = Math.ceil(promptLength / 4);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONVERSATION HISTORY:\n${conversationContext}\n\nGenerate 3 professional reply suggestions for the support agent.` }
        ],
      }),
    });

    if (!response.ok) {
      let status = "error";
      let errorMessage = "AI gateway error";

      if (response.status === 429) {
        status = "rate_limited";
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (response.status === 402) {
        status = "credits_exhausted";
        errorMessage = "AI credits exhausted. Please add more credits.";
      }

      // Log failed request
      await supabase.from("ai_usage_logs").insert({
        admin_id: adminId,
        ticket_id: ticketId,
        request_type: "suggest-ticket-reply",
        tokens_estimated: estimatedTokens,
        status,
        error_message: errorMessage,
      });

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      return new Response(JSON.stringify({ 
        error: errorMessage,
        requests_remaining: requestsRemaining - 1,
        requests_per_hour: requestsPerHour
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let suggestions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      suggestions = [
        { type: "quick", content: "Thank you for reaching out. Let me look into this for you." },
        { type: "detailed", content: "I appreciate you contacting us about this issue. I'm reviewing the details and will provide you with a solution shortly." },
        { type: "empathetic", content: "I understand this must be frustrating. I'm here to help and will do my best to resolve this for you as quickly as possible." }
      ];
    }

    // Log successful request
    await supabase.from("ai_usage_logs").insert({
      admin_id: adminId,
      ticket_id: ticketId,
      request_type: "suggest-ticket-reply",
      tokens_estimated: estimatedTokens,
      status: "success",
    });

    console.log("Generated suggestions:", suggestions);

    return new Response(JSON.stringify({ 
      suggestions,
      requests_remaining: requestsRemaining - 1,
      requests_per_hour: requestsPerHour
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error generating suggestions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
