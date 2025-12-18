import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { playWinnerSound, playDialogOpenSound } from '@/hooks/useCoinSound';

interface Prize {
  position: number;
  title: string;
  prize: string;
}

interface WinnerClaim {
  id: string;
  winner_type: string;
  event_id: string;
  submission_id: string;
  position: number;
  status: string;
  event_title?: string;
}

interface WinnerClaimDialogProps {
  claim: WinnerClaim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: () => void;
}

export function WinnerClaimDialog({ claim, open, onOpenChange, onClaimed }: WinnerClaimDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prizeInfo, setPrizeInfo] = useState<Prize | null>(null);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  // Fetch prize info when dialog opens - play sound only once
  useEffect(() => {
    if (open && claim) {
      // Play sounds only once per claim
      if (!hasPlayedSound) {
        playDialogOpenSound();
        setTimeout(() => playWinnerSound(), 200);
        setHasPlayedSound(true);
      }
      
      // Fetch event to get prize info
      const fetchPrize = async () => {
        const { data: event } = await supabase
          .from('events')
          .select('prizes')
          .eq('id', claim.event_id)
          .maybeSingle();
        
        if (event?.prizes && Array.isArray(event.prizes)) {
          const matchingPrize = (event.prizes as unknown as Prize[]).find(
            p => p.position === claim.position
          );
          setPrizeInfo(matchingPrize || null);
        }
      };
      fetchPrize();
    } else {
      setPrizeInfo(null);
    }
  }, [open, claim, hasPlayedSound]);

  const getPositionText = (position: number) => {
    switch (position) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${position}th Place`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim || !name.trim() || !email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      // First check if there's already an existing claim in the database
      const { data: existingClaim } = await supabase
        .from('winner_claims')
        .select('id, status')
        .eq('submission_id', claim.submission_id)
        .maybeSingle();

      // Prevent duplicate claims - user can only claim once
      if (existingClaim && existingClaim.status !== 'unclaimed') {
        toast.error('You have already submitted a claim for this reward');
        onOpenChange(false);
        return;
      }

      if (existingClaim) {
        // Update existing claim (created by trigger)
        const { error } = await supabase
          .from('winner_claims')
          .update({
            claim_name: name.trim(),
            claim_email: email.trim(),
            status: 'pending',
            claimed_at: new Date().toISOString()
          })
          .eq('id', existingClaim.id);

        if (error) throw error;
      } else {
        // Create new claim (for winners without existing claim record - legacy)
        const winnerTable = claim.winner_type === 'blog' ? 'winners' : 'reel_winners';
        const { data: winnerData } = await supabase
          .from(winnerTable)
          .select('id')
          .eq('submission_id', claim.submission_id)
          .maybeSingle();

        if (!winnerData) {
          throw new Error('Winner record not found');
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const authedEmail = authData.user?.email;
        if (!authedEmail) throw new Error('Please log in to claim your reward');

        const { error } = await supabase
          .from('winner_claims')
          .insert({
            winner_id: winnerData.id,
            winner_type: claim.winner_type,
            event_id: claim.event_id,
            submission_id: claim.submission_id,
            user_email: authedEmail,
            position: claim.position,
            claim_name: name.trim(),
            claim_email: email.trim(),
            status: 'pending',
            claimed_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      toast.success('Reward claim submitted successfully');
      setName('');
      setEmail('');
      onOpenChange(false);
      onClaimed();
    } catch (error: any) {
      console.error('Claim submission error:', error);
      toast.error(error.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (!claim) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-light tracking-wide">
            Congratulations
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">
            You won <span className="text-primary font-medium">{getPositionText(claim.position)}</span>
            {claim.event_title && (
              <> in <span className="text-foreground/90">{claim.event_title}</span></>
            )}
          </DialogDescription>
          
          {/* Prize Info */}
          {prizeInfo && prizeInfo.prize && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Prize</p>
              <p className="text-lg font-semibold text-foreground">{prizeInfo.prize}</p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="claim-name" className="text-sm font-medium text-foreground/80">Full Name</Label>
            <Input
              id="claim-name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-email" className="text-sm font-medium text-foreground/80">Email Address</Label>
            <Input
              id="claim-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              required
            />
          </div>

          <p className="text-xs text-muted-foreground/70 text-center py-2">
            Your reward will be issued within 48 hours. You'll receive an email confirmation.
          </p>

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-300"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 mr-2" />
                Claim Reward
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
