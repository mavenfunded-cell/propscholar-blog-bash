import { useState } from 'react';
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
import { Trophy, PartyPopper, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  const getPositionText = (position: number) => {
    switch (position) {
      case 1: return '🥇 1st Place';
      case 2: return '🥈 2nd Place';
      case 3: return '🥉 3rd Place';
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
      const { error } = await supabase
        .from('winner_claims')
        .update({
          claim_name: name.trim(),
          claim_email: email.trim(),
          status: 'pending',
          claimed_at: new Date().toISOString()
        })
        .eq('id', claim.id);

      if (error) throw error;

      toast.success('Reward claim submitted! You will receive it within 48 hours.');
      setName('');
      setEmail('');
      onOpenChange(false);
      onClaimed();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (!claim) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-yellow-500/20 animate-pulse">
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
            <PartyPopper className="w-6 h-6 text-yellow-500" />
            Congratulations!
            <PartyPopper className="w-6 h-6 text-yellow-500" />
          </DialogTitle>
          <DialogDescription className="text-center">
            You won <span className="text-yellow-500 font-semibold">{getPositionText(claim.position)}</span>
            {claim.event_title && (
              <> in <span className="text-foreground font-medium">{claim.event_title}</span></>
            )}
            ! Claim your reward below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="claim-name">Full Name</Label>
            <Input
              id="claim-name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-email">Email Address</Label>
            <Input
              id="claim-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your reward will be issued within 48 hours. You'll receive an email confirmation.
          </p>

          <Button 
            type="submit" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
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
                Claim My Reward
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
