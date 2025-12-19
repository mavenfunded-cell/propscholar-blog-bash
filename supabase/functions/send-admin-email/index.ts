import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminEmailRequest {
  subject: string;
  message: string;
  targetType: 'all' | 'specific';
  targetEmails?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const renderBackendUrl = Deno.env.get("RENDER_BACKEND_URL");

    if (!renderBackendUrl) {
      throw new Error("RENDER_BACKEND_URL is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Unauthorized - Admin access required");
    }

    const { subject, message, targetType, targetEmails }: AdminEmailRequest = await req.json();

    if (!subject || !message) {
      throw new Error("Subject and message are required");
    }

    let recipientEmails: string[] = [];

    if (targetType === 'all') {
      // Fetch all user emails
      const { data: users, error: usersError } = await supabase
        .from("user_coins")
        .select("email")
        .not("email", "is", null);

      if (usersError) throw usersError;
      recipientEmails = users?.map(u => u.email).filter(Boolean) || [];
    } else if (targetType === 'specific' && targetEmails && targetEmails.length > 0) {
      recipientEmails = targetEmails;
    } else {
      throw new Error("No recipients specified");
    }

    if (recipientEmails.length === 0) {
      throw new Error("No valid recipients found");
    }

    console.log(`Sending admin email to ${recipientEmails.length} recipients`);

    const emailLogs: Array<{
      recipient_email: string;
      subject: string;
      email_type: string;
      status: string;
      error_message: string | null;
    }> = [];

    // Send emails in batches of 10
    const batchSize = 10;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipientEmails.length; i += batchSize) {
      const batch = recipientEmails.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (email) => {
        try {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 40px;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                    🚀 PropScholar
                  </h1>
                </div>

                <!-- Main Card -->
                <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 32px; margin-bottom: 24px;">
                  <h2 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 20px 0;">
                    ${subject}
                  </h2>
                  
                  <div style="color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.7; white-space: pre-wrap;">
                    ${message.replace(/\n/g, '<br>')}
                  </div>
                </div>

                <!-- CTA -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://propscholar.com" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Visit PropScholar →
                  </a>
                </div>

                <!-- Footer -->
                <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                  <p style="color: rgba(255, 255, 255, 0.4); font-size: 13px; margin: 0;">
                    This email was sent by PropScholar. You're receiving this because you're a registered member.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;

          const response = await fetch(`${renderBackendUrl}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              subject: subject,
              html: htmlContent,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Email send failed: ${errorText}`);
          }

          successCount++;
          emailLogs.push({
            recipient_email: email,
            subject: subject,
            email_type: "admin_broadcast",
            status: "sent",
            error_message: null,
          });
        } catch (emailError: any) {
          console.error(`Failed to send to ${email}:`, emailError);
          failCount++;
          emailLogs.push({
            recipient_email: email,
            subject: subject,
            email_type: "admin_broadcast",
            status: "failed",
            error_message: emailError.message || "Unknown error",
          });
        }
      }));

      // Small delay between batches
      if (i + batchSize < recipientEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Log all emails to email_logs table
    if (emailLogs.length > 0) {
      const { error: logError } = await supabase
        .from("email_logs")
        .insert(emailLogs);

      if (logError) {
        console.error("Error logging emails:", logError);
      }
    }

    console.log(`Admin email completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: recipientEmails.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-admin-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes("Unauthorized") ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
