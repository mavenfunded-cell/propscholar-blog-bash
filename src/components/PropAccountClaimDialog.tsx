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
import { Award, Loader2 } from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  coin_cost: number;
}

interface PropAccountClaimDialogProps {
  reward: Reward | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, email: string) => Promise<void>;
}

export function PropAccountClaimDialog({ reward, open, onOpenChange, onSubmit }: PropAccountClaimDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(name.trim(), email.trim());
      setName('');
      setEmail('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!reward) return null;

  const isJournal = reward.name.toLowerCase().includes('journal');
  const rewardLabel = isJournal ? 'Trading Journal' : reward.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-purple-500/20">
              <Award className="w-12 h-12 text-purple-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Claim Your {rewardLabel}
          </DialogTitle>
          <DialogDescription className="text-center">
            Please provide your details to receive your {rewardLabel}.
            This will cost <span className="text-yellow-500 font-semibold">{reward.coin_cost} Space Coins</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="prop-name">Full Name</Label>
            <Input
              id="prop-name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-email">Email Address</Label>
            <Input
              id="prop-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isJournal 
              ? "You'll receive your journal access within 24 hours via email."
              : "Your account will be issued within 24 hours. You'll receive an email with login details."
            }
          </p>

          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Claim for {reward.coin_cost} Coins
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
