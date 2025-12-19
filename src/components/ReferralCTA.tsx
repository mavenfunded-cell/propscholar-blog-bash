import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ArrowRight, Copy, Check } from 'lucide-react';
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
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
          {/* Subtle ambient glow */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/[0.03] rounded-full blur-[80px]" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-white/[0.02] rounded-full blur-[80px]" />

          <div className="relative z-10 px-6 py-12 md:px-12 md:py-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              {/* Left side - Content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-5">
                  <span className="text-xs font-light text-white/50 tracking-wide">Earn Rewards</span>
                </div>
                
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-white/90 mb-4 tracking-tight">
                  Refer Friends, <span className="font-medium">Earn Coins</span>
                </h2>
                
                <p className="text-white/40 text-sm md:text-base max-w-md font-light leading-relaxed">
                  Share your unique link with friends. When they join, you both win.
                </p>
              </div>

              {/* Center - The equation */}
              <div className="flex items-center gap-6 md:gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <Users className="w-7 h-7 md:w-8 md:h-8 text-white/50" />
                  </div>
                  <span className="text-xs text-white/30 mt-3 font-light tracking-wide">1 Friend</span>
                </div>

                <div className="text-3xl md:text-4xl font-extralight text-white/20">=</div>

                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
                    <span className="text-2xl md:text-3xl font-medium text-white/80">1</span>
                    {/* Subtle shine */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent" />
                  </div>
                  <span className="text-xs text-white/30 mt-3 font-light tracking-wide">Space Coin</span>
                </div>
              </div>

              {/* Right side - CTA */}
              <div className="flex-shrink-0">
                <Button
                  onClick={handleClick}
                  size="lg"
                  className="group relative overflow-hidden bg-white text-black hover:bg-white/90 px-6 md:px-8 h-12 md:h-14 text-sm md:text-base font-medium rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        {user ? <Copy className="w-4 h-4" /> : null}
                        {user ? 'Copy Referral Link' : 'Start Referring'}
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}