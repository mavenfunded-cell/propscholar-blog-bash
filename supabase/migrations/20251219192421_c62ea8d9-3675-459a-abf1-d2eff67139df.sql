-- Create a function to notify blog author on new vote
CREATE OR REPLACE FUNCTION public.notify_on_blog_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vote_count integer;
  v_submission_id uuid;
  v_voter_name text;
BEGIN
  v_submission_id := NEW.submission_id;
  v_voter_name := NEW.voter_name;
  
  -- Get current vote count for this submission
  SELECT COUNT(*) INTO v_vote_count 
  FROM public.blog_votes 
  WHERE submission_id = v_submission_id;
  
  -- Call the edge function to send notification
  PERFORM net.http_post(
    url := 'https://tisijoiblvcrigwhzprn.supabase.co/functions/v1/notify-blog-vote',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2lqb2libHZjcmlnd2h6cHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4ODQsImV4cCI6MjA4MTQwODg4NH0.7A7QN4wjF1QEoBjdqBqhSALCzcKYhdVzBCpaIkgG5p8'
    ),
    body := jsonb_build_object(
      'submission_id', v_submission_id,
      'voter_name', v_voter_name,
      'vote_count', v_vote_count
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the transaction if notification fails
  RAISE NOTICE 'Vote notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create trigger to call notification function on new vote
DROP TRIGGER IF EXISTS trigger_notify_on_blog_vote ON public.blog_votes;
CREATE TRIGGER trigger_notify_on_blog_vote
  AFTER INSERT ON public.blog_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_blog_vote();