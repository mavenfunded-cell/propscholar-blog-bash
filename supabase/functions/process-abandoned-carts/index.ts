import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "https://esm.sh/nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AbandonedCart {
  id: string;
  user_email: string;
  cart_value: number;
  cart_items: Array<{
    product_name: string;
    account_size?: string;
    price: number;
    discount_applied?: number;
  }>;
  checkout_started: boolean;
  abandoned_at: string;
  emails_sent: number;
  drop_off_reason: string;
}

const EMAIL_TEMPLATES = {
  reminder: {
    subject: "You left something behind",
    getBody: (cart: AbandonedCart) => {
      const mainItem = cart.cart_items[0];
      return `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Hey there 👋</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Looks like you were checking out ${mainItem?.product_name || 'our offer'}${mainItem?.account_size ? ` (${mainItem.account_size})` : ''} but didn't complete your order.
          </p>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Your cart is still waiting for you. If you have any questions, just reply to this email.
          </p>
          <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <strong style="color: #1a1a2e;">Your Cart:</strong>
            ${cart.cart_items.map(item => `
              <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px;">
                ${item.product_name}${item.account_size ? ` - ${item.account_size}` : ''}<br>
                <span style="color: #6c757d;">$${item.price}</span>
              </div>
            `).join('')}
          </div>
          <a href="https://propscholar.com/checkout" style="display: inline-block; padding: 12px 24px; background: #0066ff; color: white; text-decoration: none; border-radius: 6px;">
            Complete Your Order
          </a>
          <p style="color: #6c757d; font-size: 12px; margin-top: 40px;">
            If you didn't start this checkout, please ignore this email.
          </p>
        </div>
      `;
    }
  },
  clarification: {
    subject: "Questions about your order?",
    getBody: (cart: AbandonedCart) => {
      const mainItem = cart.cart_items[0];
      return `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Quick question 🤔</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            I noticed you were looking at ${mainItem?.product_name || 'our offer'}${mainItem?.account_size ? ` (${mainItem.account_size})` : ''} but didn't complete the checkout.
          </p>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Was there something unclear about the rules, payouts, or how it works? I'd be happy to explain anything.
          </p>
          <p style="color: #4a4a4a; line-height: 1.6;">
            <strong>Common questions I get:</strong>
          </p>
          <ul style="color: #4a4a4a; line-height: 1.8;">
            <li>How do payouts work?</li>
            <li>What are the trading rules?</li>
            <li>How long does verification take?</li>
          </ul>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Just reply to this email and I'll get back to you personally.
          </p>
          <p style="color: #4a4a4a; margin-top: 30px;">
            Best,<br>
            The PropScholar Team
          </p>
        </div>
      `;
    }
  },
  trust: {
    subject: "Here's how it works",
    getBody: (cart: AbandonedCart) => {
      const mainItem = cart.cart_items[0];
      return `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Let me explain how it works 📋</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            I saw you were interested in ${mainItem?.product_name || 'our offer'}${mainItem?.account_size ? ` (${mainItem.account_size})` : ''}. Here's a quick breakdown of how everything works:
          </p>
          <div style="margin: 20px 0; padding: 20px; background: #f0f9ff; border-left: 4px solid #0066ff; border-radius: 4px;">
            <p style="margin: 0; color: #1a1a2e;"><strong>✅ Transparent Rules</strong></p>
            <p style="margin: 10px 0 0 0; color: #4a4a4a;">All trading rules are clearly outlined before you start.</p>
          </div>
          <div style="margin: 20px 0; padding: 20px; background: #f0fff0; border-left: 4px solid #00cc66; border-radius: 4px;">
            <p style="margin: 0; color: #1a1a2e;"><strong>💰 Fast Payouts</strong></p>
            <p style="margin: 10px 0 0 0; color: #4a4a4a;">Get your profits paid out quickly once you hit your targets.</p>
          </div>
          <div style="margin: 20px 0; padding: 20px; background: #fff9f0; border-left: 4px solid #ff9900; border-radius: 4px;">
            <p style="margin: 0; color: #1a1a2e;"><strong>🛡️ No Hidden Fees</strong></p>
            <p style="margin: 10px 0 0 0; color: #4a4a4a;">What you see is what you pay. No surprises.</p>
          </div>
          <p style="color: #4a4a4a; line-height: 1.6; margin-top: 30px;">
            Have more questions? Just reply to this email.
          </p>
          <a href="https://propscholar.com/checkout" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0066ff; color: white; text-decoration: none; border-radius: 6px;">
            Continue to Checkout
          </a>
        </div>
      `;
    }
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if emails are enabled
    const { data: settings } = await supabase.rpc("get_conversion_settings");
    const emailsEnabled = settings?.find((s: { setting_key: string; setting_value: unknown }) => s.setting_key === "emails_enabled")?.setting_value;
    const delayMinutes = settings?.find((s: { setting_key: string; setting_value: unknown }) => s.setting_key === "abandoned_cart_delay_minutes")?.setting_value || 45;
    const maxEmails = settings?.find((s: { setting_key: string; setting_value: unknown }) => s.setting_key === "max_emails_per_cart")?.setting_value || 2;

    if (emailsEnabled === false) {
      return new Response(JSON.stringify({ message: "Emails disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get abandoned carts that need emails
    const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();
    
    const { data: abandonedCarts, error } = await supabase
      .from("abandoned_carts")
      .select("*")
      .eq("recovery_status", "pending")
      .eq("recovered", false)
      .not("user_email", "is", null)
      .lt("abandoned_at", cutoffTime)
      .lt("emails_sent", maxEmails)
      .order("abandoned_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error fetching abandoned carts:", error);
      throw error;
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(JSON.stringify({ message: "No carts to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("HOSTINGER_SMTP_HOST") || "smtp.hostinger.com",
      port: parseInt(Deno.env.get("HOSTINGER_SMTP_PORT") || "465"),
      secure: true,
      auth: {
        user: Deno.env.get("HOSTINGER_CAMPAIGN_EMAIL"),
        pass: Deno.env.get("HOSTINGER_CAMPAIGN_PASSWORD"),
      },
    });

    let emailsSent = 0;

    for (const cart of abandonedCarts as AbandonedCart[]) {
      try {
        // Determine which email to send based on emails_sent and drop_off_reason
        let emailType: keyof typeof EMAIL_TEMPLATES = "reminder";
        
        if (cart.emails_sent === 0) {
          emailType = "reminder";
        } else if (cart.emails_sent === 1) {
          // Second email based on drop-off reason
          if (cart.drop_off_reason === "trust_concern" || cart.drop_off_reason === "decision_hesitation") {
            emailType = "trust";
          } else {
            emailType = "clarification";
          }
        }

        const template = EMAIL_TEMPLATES[emailType];
        
        await transporter.sendMail({
          from: `"PropScholar" <${Deno.env.get("HOSTINGER_CAMPAIGN_EMAIL")}>`,
          to: cart.user_email,
          subject: template.subject,
          html: template.getBody(cart),
        });

        // Record the email
        await supabase.from("cart_recovery_emails").insert({
          abandoned_cart_id: cart.id,
          email_type: emailType,
        });

        // Update cart
        await supabase
          .from("abandoned_carts")
          .update({
            emails_sent: cart.emails_sent + 1,
            recovery_status: cart.emails_sent + 1 >= maxEmails ? "emails_completed" : "pending",
          })
          .eq("id", cart.id);

        emailsSent++;
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (emailError) {
        console.error(`Error sending email to ${cart.user_email}:`, emailError);
      }
    }

    return new Response(JSON.stringify({ success: true, emails_sent: emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing abandoned carts:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
