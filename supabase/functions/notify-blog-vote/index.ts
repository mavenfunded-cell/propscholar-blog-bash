import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RENDER_BACKEND_URL = "https://propscholar-blog-bash.onrender.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoteNotificationRequest {
  submission_id: string;
  voter_name: string;
  vote_count: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-blog-vote: Function invoked");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { submission_id, voter_name, vote_count }: VoteNotificationRequest = await req.json();
    
    console.log(`notify-blog-vote: Processing vote for submission ${submission_id}, voter: ${voter_name}, total votes: ${vote_count}`);

    if (!submission_id) {
      console.error("notify-blog-vote: Missing submission_id");
      return new Response(JSON.stringify({ error: "Missing submission_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('email, name, blog_title, event_id')
      .eq('id', submission_id)
      .single();

    if (submissionError || !submission) {
      console.error("notify-blog-vote: Could not find submission", submissionError);
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get event title
    const { data: event } = await supabase
      .from('events')
      .select('title, slug')
      .eq('id', submission.event_id)
      .single();

    const blogTitle = submission.blog_title || 'Your Blog Post';
    const eventTitle = event?.title || 'Competition';
    const eventSlug = event?.slug || '';
    const authorEmail = submission.email;
    const authorName = submission.name;

    // Mask voter name for privacy if too long
    const displayVoterName = voter_name.length > 20 ? voter_name.substring(0, 17) + '...' : voter_name;

    console.log(`notify-blog-vote: Sending email to ${authorEmail}`);

    const emailSubject = `🎉 New Vote! Your blog now has ${vote_count} vote${vote_count > 1 ? 's' : ''}`;

    const emailHtml = `
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
                    <div style="text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 64px;">🗳️</span>
                    </div>
                    
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 12px 0; text-align: center;">
                      Someone Voted for You!
                    </h1>
                    
                    <p style="color: rgba(255,255,255,0.8); font-size: 18px; margin: 0 0 24px 0; text-align: center;">
                      Hey ${authorName}, your blog is getting noticed! 🚀
                    </p>
                    
                    <!-- Vote Count Display -->
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%); border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.4); text-align: center;">
                      <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Total Votes</p>
                      <p style="color: #a78bfa; font-size: 72px; font-weight: bold; margin: 0; text-shadow: 0 0 30px rgba(139, 92, 246, 0.5);">
                        ${vote_count}
                      </p>
                      <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 8px 0 0 0;">and counting...</p>
                    </div>
                    
                    <!-- Blog Details -->
                    <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Blog Title</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px; font-weight: 500;">${blogTitle}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: rgba(255,255,255,0.5); font-size: 14px;">Competition</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #ffffff; font-size: 14px;">${eventTitle}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: rgba(255,255,255,0.5); font-size: 14px;">New Voter</span>
                          </td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="color: #a78bfa; font-size: 14px; font-weight: 500;">${displayVoterName}</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- CTA Section - Referral -->
                    <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(234, 179, 8, 0.3);">
                      <div style="text-align: center; margin-bottom: 12px;">
                        <span style="font-size: 32px;">💡</span>
                      </div>
                      <h3 style="color: #fbbf24; font-size: 18px; margin: 0 0 8px 0; text-align: center;">
                        Want More Votes?
                      </h3>
                      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; text-align: center; line-height: 1.6;">
                        <strong style="color: #fbbf24;">Refer Friends = More Votes + Space Coins!</strong><br>
                        Share your referral link and when friends join, they can vote for your blog!<br>
                        <span style="color: rgba(255,255,255,0.6);">Plus, you'll earn bonus Space Coins for every referral.</span>
                      </p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          <a href="https://propscholar.space/blog/${eventSlug}" 
                             style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                            View Your Blog
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="https://propscholar.space/dashboard" 
                             style="display: inline-block; background: linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%); color: #fbbf24; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; border: 1px solid rgba(234, 179, 8, 0.4);">
                            🔗 Get Referral Link
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
                      Keep creating amazing content - the community is watching!
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

    const emailResponse = await fetch(RENDER_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: authorEmail,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    const emailStatus = emailResult.success ? 'sent' : 'failed';
    
    console.log("notify-blog-vote: Email response:", emailResult);

    // Log the email to email_logs table
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: authorEmail,
        subject: emailSubject,
        email_type: 'vote_notification',
        status: emailStatus,
        event_id: submission.event_id,
        error_message: emailResult.success ? null : JSON.stringify(emailResult),
      });

    if (logError) {
      console.error("notify-blog-vote: Failed to log email:", logError);
    } else {
      console.log("notify-blog-vote: Email logged successfully");
    }

    return new Response(
      JSON.stringify({ success: true, email_status: emailStatus }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("notify-blog-vote: Error:", error);
    
    // Log failed email attempt
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: 'unknown',
          subject: 'Vote notification (failed)',
          email_type: 'vote_notification',
          status: 'failed',
          error_message: error.message,
        });
    } catch (logErr) {
      console.error("notify-blog-vote: Failed to log error:", logErr);
    }
    
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
