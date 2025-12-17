-- Update the notify_balance_change function with direct Supabase URL
CREATE OR REPLACE FUNCTION public.notify_balance_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_balance integer;
BEGIN
  -- Get current balance
  SELECT balance INTO v_user_balance FROM public.user_coins WHERE user_id = NEW.user_id;
  
  -- Make async HTTP call to edge function using pg_net
  PERFORM net.http_post(
    url := 'https://tisijoiblvcrigwhzprn.supabase.co/functions/v1/notify-balance-change',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2lqb2libHZjcmlnd2h6cHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4ODQsImV4cCI6MjA4MTQwODg4NH0.7A7QN4wjF1QEoBjdqBqhSALCzcKYhdVzBCpaIkgG5p8'
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'amount', NEW.amount,
      'transaction_type', NEW.transaction_type,
      'source', NEW.source,
      'description', COALESCE(NEW.description, ''),
      'new_balance', COALESCE(v_user_balance, 0)
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the transaction if notification fails
  RAISE NOTICE 'Balance notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;