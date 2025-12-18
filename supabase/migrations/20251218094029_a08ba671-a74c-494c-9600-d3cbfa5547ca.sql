-- Create trigger to call create_winner_claim function when a blog winner is inserted
CREATE TRIGGER on_winner_created
  AFTER INSERT ON public.winners
  FOR EACH ROW
  EXECUTE FUNCTION public.create_winner_claim();

-- Create trigger to call create_reel_winner_claim function when a reel winner is inserted
CREATE TRIGGER on_reel_winner_created
  AFTER INSERT ON public.reel_winners
  FOR EACH ROW
  EXECUTE FUNCTION public.create_reel_winner_claim();