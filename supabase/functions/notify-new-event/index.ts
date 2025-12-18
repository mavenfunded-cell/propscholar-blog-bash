import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RENDER_BACKEND_URL = "https://propscholar-blog-bash.onrender.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventNotificationRequest {
  event_id: string;
  event_title: string;
  event_description: string;
  event_type: string;
  start_date: string;
  end_date: string;
}

interface EmailLog {
  recipient_email: string;
  subject: string;
  email_type: string;
  status: string;
  error_message?: string;
  event_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-new-event: Function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_id, event_title, event_description, event_type, start_date, end_date }: EventNotificationRequest = await req.json();
    
    console.log(`notify-new-event: Processing event ${event_id} - ${event_title}`);

    if (!event_id || !event_title) {
      console.error("notify-new-event: Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: users, error: usersError } = await supabase
      .from("user_coins")
      .select("email")
      .not("email", "is", null);

    if (usersError) {
      console.error("notify-new-event: Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("notify-new-event: No users to notify");
      return new Response(JSON.stringify({ success: true, message: "No users to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emails = users.map(u => u.email).filter(Boolean);
    console.log(`notify-new-event: Sending individual notifications to ${emails.length} users`);

    const eventTypeLabel = event_type === "reel" ? "Reel Competition" : "Blog Competition";
    const eventEmoji = event_type === "reel" ? "🎬" : "📝";
    const startDateFormatted = new Date(start_date).toLocaleDateString("en-US", { 
      weekday: "long", year: "numeric", month: "long", day: "numeric" 
    });
    const endDateFormatted = new Date(end_date).toLocaleDateString("en-US", { 
      weekday: "long", year: "numeric", month: "long", day: "numeric" 
    });

    const subject = `New ${eventTypeLabel} - ${event_title}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #030014; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030014; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
                <!-- Logo -->
                <tr>
                  <td align="center" style="padding-bottom: 30px;">
                    <img src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765962713/Untitled_design_3_nkt1ky.png" alt="PropScholar Space" width="80" style="display: block;">
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="background: linear-gradient(180deg, #0f0a2e 0%, #1a0a3e 50%, #0a0a1a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.3);">
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px 0; text-align: center;">
                      ${eventEmoji} New ${eventTypeLabel}
                    </h1>
                    <h2 style="color: #a78bfa; font-size: 22px; margin: 0 0 20px 0; text-align: center;">
                      ${event_title}
                    </h2>
                    
                    <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      ${event_description.slice(0, 200)}${event_description.length > 200 ? '...' : ''}
                    </p>
                    
                    <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
                      <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 8px 0;">Competition Period</p>
                      <p style="color: #ffffff; font-size: 16px; margin: 0;">
                        ${startDateFormatted} - ${endDateFormatted}
                      </p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="https://propscholar.space/${event_type === 'reel' ? 'reels' : 'events'}" 
                             style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                            View Competition
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding-top: 30px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                      Participate and earn Space Coins at PropScholar Space
                    </p>
                    <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 10px 0 0 0;">
                      PropScholar Space - Where Traders Become Scholars
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    let successCount = 0;
    let errorCount = 0;
    const emailLogs: EmailLog[] = [];

    // Send individual emails to each user to protect privacy
    const sendEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const emailResponse = await fetch(RENDER_BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: email,
            subject,
            html: htmlContent,
          }),
        });
        
        if (emailResponse.ok) {
          return { success: true };
        } else {
          const errorText = await emailResponse.text();
          return { success: false, error: errorText };
        }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    };

    // Process in batches of 10 concurrent requests
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (email) => {
        const result = await sendEmail(email);
        return { email, ...result };
      }));
      
      results.forEach(result => {
        if (result.success) {
          successCount++;
          emailLogs.push({
            recipient_email: result.email,
            subject,
            email_type: 'announcement',
            status: 'sent',
            event_id,
          });
        } else {
          errorCount++;
          emailLogs.push({
            recipient_email: result.email,
            subject,
            email_type: 'announcement',
            status: 'failed',
            error_message: result.error,
            event_id,
          });
        }
      });
      
      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Log all email sends to database
    if (emailLogs.length > 0) {
      const { error: logError } = await supabase
        .from('email_logs')
        .insert(emailLogs);
      
      if (logError) {
        console.error('notify-new-event: Failed to log emails:', logError);
      } else {
        console.log(`notify-new-event: Logged ${emailLogs.length} email records`);
      }
    }

    console.log(`notify-new-event: Completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: errorCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("notify-new-event: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
