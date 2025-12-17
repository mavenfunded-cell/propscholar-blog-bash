-- Update the create_winner_claim function to also send email notification
CREATE OR REPLACE FUNCTION public.create_winner_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_name text;
  v_event_title text;
BEGIN
  -- Get email and name from submission
  SELECT email, name INTO v_email, v_name FROM public.submissions WHERE id = NEW.submission_id;
  
  -- Get event title
  SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;
  
  -- Insert winner claim if not exists
  INSERT INTO public.winner_claims (winner_id, winner_type, event_id, submission_id, user_email, position)
  VALUES (NEW.id, 'blog', NEW.event_id, NEW.submission_id, v_email, NEW.position)
  ON CONFLICT DO NOTHING;
  
  -- Send email notification via edge function
  PERFORM net.http_post(
    url := 'https://tisijoiblvcrigwhzprn.supabase.co/functions/v1/notify-winner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2lqb2libHZjcmlnd2h6cHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4ODQsImV4cCI6MjA4MTQwODg4NH0.7A7QN4wjF1QEoBjdqBqhSALCzcKYhdVzBCpaIkgG5p8'
    ),
    body := jsonb_build_object(
      'email', v_email,
      'name', v_name,
      'position', NEW.position,
      'event_title', COALESCE(v_event_title, 'Competition'),
      'winner_type', 'blog'
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the transaction if notification fails
  RAISE NOTICE 'Winner notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Update the create_reel_winner_claim function to also send email notification
CREATE OR REPLACE FUNCTION public.create_reel_winner_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_name text;
  v_event_title text;
BEGIN
  -- Get email and name from reel submission
  SELECT email, name INTO v_email, v_name FROM public.reel_submissions WHERE id = NEW.submission_id;
  
  -- Get event title
  SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;
  
  -- Insert winner claim if not exists
  INSERT INTO public.winner_claims (winner_id, winner_type, event_id, submission_id, user_email, position)
  VALUES (NEW.id, 'reel', NEW.event_id, NEW.submission_id, v_email, NEW.position)
  ON CONFLICT DO NOTHING;
  
  -- Send email notification via edge function
  PERFORM net.http_post(
    url := 'https://tisijoiblvcrigwhzprn.supabase.co/functions/v1/notify-winner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2lqb2libHZjcmlnd2h6cHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4ODQsImV4cCI6MjA4MTQwODg4NH0.7A7QN4wjF1QEoBjdqBqhSALCzcKYhdVzBCpaIkgG5p8'
    ),
    body := jsonb_build_object(
      'email', v_email,
      'name', v_name,
      'position', NEW.position,
      'event_title', COALESCE(v_event_title, 'Competition'),
      'winner_type', 'reel'
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the transaction if notification fails
  RAISE NOTICE 'Winner notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;