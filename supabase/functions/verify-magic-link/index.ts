import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Token validation: 64 hex characters (32 bytes)
const TOKEN_REGEX = /^[a-f0-9]{64}$/;

function validateToken(token: unknown): string {
  if (typeof token !== 'string') {
    throw new Error("Token must be a string");
  }
  const trimmed = token.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("Token is required");
  }
  if (!TOKEN_REGEX.test(trimmed)) {
    throw new Error("Invalid token format");
  }
  return trimmed;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("verify-magic-link function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate token format
    const token = validateToken(body.token);

    console.log("Verifying token");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the token
    const { data: tokenData, error: findError } = await supabase
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (findError || !tokenData) {
      console.error("Token not found or already used");
      throw new Error("Invalid or expired token");
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.error("Token expired");
      // Clean up expired token
      await supabase
        .from('magic_link_tokens')
        .update({ used: true })
        .eq('id', tokenData.id);
      throw new Error("Token has expired");
    }

    // Mark token as used
    await supabase
      .from('magic_link_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    const email = tokenData.email;
    console.log("Token verified for email:", email);

    let userId: string;

    // Try to create user first - if they exist, it will fail with email_exists
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message.includes("already been registered") || (createError as any).code === "email_exists") {
        // User exists - get user by email using admin API
        console.log("User already exists, finding user by email...");
        
        // List users and search through pages if needed
        let foundUser = null;
        let page = 1;
        const perPage = 1000;
        
        while (!foundUser) {
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
            page,
            perPage,
          });
          
          if (listError) {
            console.error("Failed to list users:", listError);
            throw new Error("Failed to find user account");
          }
          
          foundUser = users.find(u => u.email === email);
          
          if (foundUser || users.length < perPage) break;
          page++;
        }
        
        if (!foundUser) {
          console.error("Could not find user with email:", email);
          throw new Error("Failed to find user account");
        }
        
        userId = foundUser.id;
        console.log("Found existing user:", userId);
      } else {
        console.error("Failed to create user:", createError);
        throw new Error("Failed to create account");
      }
    } else if (newUser?.user) {
      userId = newUser.user.id;
      console.log("Created new user:", userId);
    } else {
      throw new Error("Failed to create account");
    }

    // Generate a magic link for sign-in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError || !linkData) {
      console.error("Failed to generate sign-in link:", linkError);
      throw new Error("Failed to generate sign-in link");
    }

    // Extract the token hash from the generated link
    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    console.log("Generated auth link successfully");

    return new Response(JSON.stringify({ 
      success: true,
      email,
      token_hash: tokenHash,
      type: type,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in verify-magic-link function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
