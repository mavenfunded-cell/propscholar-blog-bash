import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ArrowRight, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ReferralCTA() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const handleClick = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Fetch referral code if not already loaded
    if (!referralCode) {
      const { data } = await supabase
        .from('user_coins')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();
      
      if (data?.referral_code) {
        setReferralCode(data.referral_code);
        copyToClipboard(`${window.location.origin}/auth?ref=${data.referral_code}`);
      }
    } else {
      copyToClipboard(`${window.location.origin}/auth?ref=${referralCode}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            {/* Floating particles */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.8s' }} />
          </div>

          <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Left side - Content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Earn Rewards</span>
                </div>
                
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
                  Refer Friends, <span className="text-primary">Earn Coins</span>
                </h2>
                
                <p className="text-muted-foreground text-sm md:text-base max-w-md">
                  Share your unique link with friends. When they join, you both win.
                </p>
              </div>

              {/* Center - The equation */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                    <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 font-medium">1 Friend</span>
                </div>

                <div className="text-3xl md:text-4xl font-light text-muted-foreground">=</div>

                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <span className="text-2xl md:text-3xl font-bold text-amber-400">1</span>
                    {/* Coin shine effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 font-medium">Space Coin</span>
                </div>
              </div>

              {/* Right side - CTA */}
              <div className="flex-shrink-0">
                <Button
                  onClick={handleClick}
                  size="lg"
                  className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground px-6 md:px-8 h-12 md:h-14 text-sm md:text-base font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        {user ? <Copy className="w-5 h-5" /> : null}
                        {user ? 'Copy Referral Link' : 'Start Referring'}
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}