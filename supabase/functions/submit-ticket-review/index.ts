import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ticketId = url.searchParams.get("ticketId");
    const email = url.searchParams.get("email");
    const rating = parseInt(url.searchParams.get("rating") || "0");

    console.log("Submitting review:", { ticketId, email, rating });

    if (!ticketId || !email || rating < 1 || rating > 5) {
      return new Response(getErrorHtml("Invalid review parameters"), {
        status: 400,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: existingReview } = await supabase
      .from("ticket_reviews")
      .select("id")
      .eq("ticket_id", ticketId)
      .single();

    if (existingReview) {
      return new Response(getAlreadyReviewedHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    const { error } = await supabase.from("ticket_reviews").insert({
      ticket_id: ticketId,
      user_email: email,
      rating: rating,
    });

    if (error) {
      console.error("Error inserting review:", error);
      throw error;
    }

    console.log("Review submitted successfully");
    return new Response(getSuccessHtml(rating), {
      status: 200,
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error submitting review:", error);
    return new Response(getErrorHtml(error.message), {
      status: 500,
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  }
};

function getSuccessHtml(rating: number): string {
  const stars = "⭐".repeat(rating);
  const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Thank You - PropScholar</title></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;padding:40px;max-width:500px;"><img src="${logoUrl}" alt="PropScholar" style="height:60px;margin-bottom:30px;border-radius:8px;"/><div style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:20px;border:1px solid rgba(16,185,129,0.3);padding:40px;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);width:80px;height:80px;border-radius:50%;margin-bottom:20px;line-height:80px;"><span style="font-size:40px;color:#fff;">✓</span></div><h1 style="color:#f8fafc;font-size:28px;margin:0 0 15px 0;">Thank You!</h1><p style="color:#94a3b8;font-size:16px;margin:0 0 20px 0;">Your feedback has been recorded</p><p style="font-size:32px;margin:0 0 25px 0;">${stars}</p><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#fff;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:600;font-size:14px;">Visit PropScholar</a></div></div></body></html>`;
}

function getAlreadyReviewedHtml(): string {
  const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Already Reviewed - PropScholar</title></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;padding:40px;max-width:500px;"><img src="${logoUrl}" alt="PropScholar" style="height:60px;margin-bottom:30px;border-radius:8px;"/><div style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:20px;border:1px solid rgba(245,158,11,0.3);padding:40px;"><div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);width:80px;height:80px;border-radius:50%;margin-bottom:20px;line-height:80px;"><span style="font-size:40px;color:#fff;">!</span></div><h1 style="color:#f8fafc;font-size:28px;margin:0 0 15px 0;">Already Reviewed</h1><p style="color:#94a3b8;font-size:16px;margin:0 0 25px 0;">You've already submitted feedback for this ticket. Thank you!</p><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#fff;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:600;font-size:14px;">Visit PropScholar</a></div></div></body></html>`;
}

function getErrorHtml(message: string): string {
  const logoUrl = "https://res.cloudinary.com/dzozyqlqr/image/upload/v1763325013/d0d1d9_dthfiq.jpg";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Error - PropScholar</title></head><body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;padding:40px;max-width:500px;"><img src="${logoUrl}" alt="PropScholar" style="height:60px;margin-bottom:30px;border-radius:8px;"/><div style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 100%);border-radius:20px;border:1px solid rgba(239,68,68,0.3);padding:40px;"><div style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);width:80px;height:80px;border-radius:50%;margin-bottom:20px;line-height:80px;"><span style="font-size:40px;color:#fff;">✕</span></div><h1 style="color:#f8fafc;font-size:28px;margin:0 0 15px 0;">Oops!</h1><p style="color:#94a3b8;font-size:16px;margin:0 0 25px 0;">Something went wrong. Please try again later.</p><a href="https://www.propscholar.com" style="display:inline-block;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#fff;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:600;font-size:14px;">Visit PropScholar</a></div></div></body></html>`;
}

serve(handler);
