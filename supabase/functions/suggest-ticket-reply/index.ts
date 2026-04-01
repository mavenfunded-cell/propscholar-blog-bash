import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SuggestionType = "quick" | "detailed" | "empathetic";

type ReplySuggestion = {
  type: SuggestionType;
  content: string;
};

const FORBIDDEN_ACCOUNT_STATUS_PATTERNS = [
  /\bbreach(?:ed)?\b/i,
  /\bflag(?:ged)?\b/i,
  /\bbann?ed\b/i,
  /\bsuspend(?:ed)?\b/i,
  /\bdisable(?:d)?\b/i,
  /\brestrict(?:ed|ion)?\b/i,
  /\bviolat(?:e|ed|ion|ing)\b/i,
  /\bterminate(?:d)?\b/i,
  /\breject(?:ed|ion)?\b/i,
  /\bdisqualif(?:ied|y)\b/i,
  /\bnot eligible\b/i,
];

const hasUnsafeAccountStatusClaim = (text: string) =>
  FORBIDDEN_ACCOUNT_STATUS_PATTERNS.some((pattern) => pattern.test(text));

const buildSafeSuggestion = (type: SuggestionType): ReplySuggestion => {
  switch (type) {
    case "quick":
      return {
        type,
        content:
          "Thanks for your patience. I'm checking this with the team right now, so please give me a little time and I'll come back with a confirmed update.",
      };
    case "detailed":
      return {
        type,
        content:
          "Thanks for flagging this. I'm currently reviewing the details with the team and I don't want to give you an incorrect answer before that check is complete. Please give me a little time while we verify everything properly, and I'll come back to you with a confirmed update as soon as the review is done.",
      };
    case "empathetic":
      return {
        type,
        content:
          "I understand this is frustrating, and I appreciate your patience. I'm checking this internally right now and I want to make sure I come back with the correct update rather than making assumptions. Please give me a little time and I'll follow up as soon as the review is complete.",
      };
  }
};

const sanitizeSuggestions = (suggestions: ReplySuggestion[]): ReplySuggestion[] => {
  const requiredTypes: SuggestionType[] = ["quick", "detailed", "empathetic"];

  return requiredTypes.map((type) => {
    const suggestion = suggestions.find((item) => item?.type === type);

    if (!suggestion?.content?.trim() || hasUnsafeAccountStatusClaim(suggestion.content)) {
      return buildSafeSuggestion(type);
    }

    return {
      type,
      content: suggestion.content.trim(),
    };
  });
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
    // Verify JWT and admin role
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - No token provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Not an admin:", userData.user.id);
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use verified user ID as adminId instead of client-provided value
    const adminId = userData.user.id;
    
    const { ticketId, conversationHistory } = await req.json();
    console.log("Generating AI suggestions for ticket:", ticketId, "by verified admin:", adminId);

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

    const systemPrompt = `You are Scholaris AI — PropScholar's elite support intelligence. You are the most knowledgeable support agent in the prop trading industry. You know EVERYTHING about PropScholar inside out.

CRITICAL IDENTITY:
- PropScholar is NOT a prop firm. It is a scholarship-based trading evaluation platform.
- Tagline: "You Pass, We Pay."
- Founded by Suman Saurav (CEO) and Shivam Banerjee (Co-Founder).
- 1+ year operational history, 3000+ trusted traders, 50+ challenges.

CORE KNOWLEDGE:
${knowledgeContext}

CANNED RESPONSES (use as templates when relevant):
${cannedContext}

BEHAVIORAL RULES:
1. NEVER say "I don't know" — you have comprehensive knowledge. If something is genuinely outside scope, direct to support@propscholar.com or Discord.
2. ALWAYS be specific — mention exact numbers ($5 entry, 400% refund, 4-hour payouts, 0 spread, etc.)
3. ALWAYS defend PropScholar's reputation professionally if questioned.
4. Use PropScholar terminology: "scholarship" not "funded account", "evaluation" not "challenge" (unless referring to other firms), "direct payout" not "withdrawal".
5. Know the rules cold: No lot limit, No consistency rule, No trailing drawdown, No news restrictions, No minimum holding, No time limit, 10% profit target, 6% max drawdown, 3% daily loss, 1:50 leverage.
6. Know payment methods: UPI (PhonePe/Razorpay/Cashfree), Crypto, Card, PayPal. Credentials in 120 seconds.
7. Know platforms: PropScholar Trial ($1), FTMO, Instant, QT, Maven, Goat Funded Trader, Funding Pips, Blueberry Funded, Alpha Capital Group, 5%ers.
8. After passing: Direct payout within 4 hours (most within 1 hour). No funded stage, no activation fee.
9. Community: Discord (2500+ members), Instagram (@propscholar), X (@propscholar).
10. NEVER state or imply that a user's account/evaluation is breached, flagged, banned, suspended, restricted, disabled, rejected, disqualified, or in violation unless a human admin has already explicitly confirmed that exact status in the conversation history.
11. If the case is account-specific, unclear, or under review, default to delay-safe language: "I'm checking this for you," "Please give me a little time," "We're reviewing this internally," and "We'll get back to you with a confirmed update."
12. Never infer account status from partial context, missing data, policy knowledge, or tone.
13. For sensitive cases, all 3 replies must acknowledge the issue, avoid conclusions, and promise follow-up after review.
14. NEVER mention discounts, penalties, or remedial offers tied to an account outcome unless the user explicitly asks and a human-confirmed status already exists in the conversation history.

RESPONSE STYLE:
- Professional yet warm, like a senior support agent who genuinely cares
- Use the trader's context to personalize responses
- Include relevant links when helpful (propscholar.com/shop, Discord invite, etc.)
- Be solution-oriented — always provide next steps

Generate 3 suggested replies in this exact JSON format:
[
  {"type": "quick", "content": "A concise, direct response that solves the issue fast"},
  {"type": "detailed", "content": "A comprehensive response with full context, specific details, links, and next steps"},
  {"type": "empathetic", "content": "A warm, understanding response that acknowledges the trader's situation while providing solutions"}
]

Return ONLY the JSON array. No other text.`;

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
    let suggestions: ReplySuggestion[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      suggestions = [];
    }

    suggestions = sanitizeSuggestions(Array.isArray(suggestions) ? suggestions : []);

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
