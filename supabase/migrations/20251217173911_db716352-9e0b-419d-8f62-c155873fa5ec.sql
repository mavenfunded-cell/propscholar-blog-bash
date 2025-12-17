-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to notify balance changes via HTTP
CREATE OR REPLACE FUNCTION public.notify_balance_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_balance integer;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Get current balance
  SELECT balance INTO v_user_balance FROM public.user_coins WHERE user_id = NEW.user_id;
  
  -- Get Supabase URL from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Only send notification if we have a valid URL
  IF v_supabase_url IS NOT NULL AND v_supabase_url != '' THEN
    -- Make async HTTP call to edge function
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-balance-change',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the transaction if notification fails
  RAISE NOTICE 'Balance notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for balance change notifications
DROP TRIGGER IF EXISTS on_coin_transaction_notify ON public.coin_transactions;
CREATE TRIGGER on_coin_transaction_notify
  AFTER INSERT ON public.coin_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_balance_change();