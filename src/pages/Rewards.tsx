import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Coins, 
  Gift, 
  Trophy, 
  Share2, 
  Clock, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Loader2,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  Percent,
  Award,
  Upload,
  Image as ImageIcon,
  PartyPopper
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface UserCoins {
  balance: number;
  total_earned: number;
  total_spent: number;
  referral_code: string;
  signup_coins_claimed: boolean;
}

interface CoinTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string;
  created_at: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  coin_cost: number;
  reward_type: string;
  expiry_days: number;
  max_claims_per_user: number;
  is_enabled: boolean;
}

interface RewardClaim {
  id: string;
  coins_spent: number;
  status: string;
  coupon_code: string | null;
  expires_at: string | null;
  created_at: string;
  reward: Reward;
}

interface RewardSettings {
  [key: string]: {
    enabled: boolean;
    value: number;
    url?: string;
  };
}

interface SocialFollow {
  platform: string;
  status?: string;
}

interface Referral {
  id: string;
  referred_email: string;
  status: string;
  coins_rewarded: number;
  created_at: string;
}

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  discord: MessageCircle,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30',
  instagram: 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/30',
  twitter: 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30',
  discord: 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30',
  youtube: 'bg-red-600/20 text-red-400 hover:bg-red-600/30',
};

const REFERRAL_DOMAIN = 'https://propscholar.space';

export default function Rewards() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [settings, setSettings] = useState<RewardSettings>({});
  const [socialFollows, setSocialFollows] = useState<SocialFollow[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimingSocial, setClaimingSocial] = useState<string | null>(null);
  const [claimingSignup, setClaimingSignup] = useState(false);
  
  // Social follow screenshot upload state
  const [socialDialog, setSocialDialog] = useState<{ open: boolean; platform: string | null }>({ open: false, platform: null });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; reward: Reward | null; couponCode: string | null }>({ 
    open: false, 
    reward: null, 
    couponCode: null 
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch user coins
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (coinsData) {
        setUserCoins(coinsData);
      } else {
        // Check for referral code in localStorage
        const referralCode = localStorage.getItem('referral_code');
        let referredBy = null;
        
        if (referralCode) {
          // Find referrer by code
          const { data: referrer } = await supabase
            .from('user_coins')
            .select('user_id')
            .eq('referral_code', referralCode)
            .maybeSingle();
          
          if (referrer) {
            referredBy = referrer.user_id;
          }
          localStorage.removeItem('referral_code');
        }
        
        // Create user_coins record with referral
        const { data: newCoins } = await supabase
          .from('user_coins')
          .insert({ 
            user_id: user.id, 
            email: user.email || '',
            referred_by: referredBy
          })
          .select()
          .single();
        setUserCoins(newCoins);
      }

      // Fetch transactions
      const { data: txData } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txData || []);

      // Fetch rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_enabled', true);

      setRewards(rewardsData || []);

      // Fetch claims with reward info
      const { data: claimsData } = await supabase
        .from('reward_claims')
        .select('*, reward:rewards(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setClaims((claimsData || []).map((c: any) => ({
        ...c,
        reward: c.reward
      })));

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('reward_settings')
        .select('*');

      const settingsMap: RewardSettings = {};
      (settingsData || []).forEach((s: any) => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      setSettings(settingsMap);

      // Fetch social follows
      const { data: followsData } = await supabase
        .from('social_follows')
        .select('platform, status')
        .eq('user_id', user.id);

      setSocialFollows(followsData || []);
      
      // Fetch referrals (users who signed up from your link)
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);
    } catch (error) {
      console.error('Error fetching rewards data:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimSignupCoins = async () => {
    if (!user || claimingSignup) return;
    setClaimingSignup(true);

    try {
      const { data, error } = await supabase.rpc('claim_signup_coins', { _user_id: user.id });
      
      if (error) throw error;
      
      const result = data as any;
      if (result?.success) {
        toast.success(`Welcome! You earned ${result.coins} Space Coins!`);
        fetchData();
      } else {
        toast.error(result?.error || 'Failed to claim signup coins');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim signup coins');
    } finally {
      setClaimingSignup(false);
    }
  };

  const openSocialDialog = (platform: string) => {
    const socialSetting = settings[`social_${platform}`];
    if (socialSetting?.url) {
      window.open(socialSetting.url, '_blank');
    }
    setSocialDialog({ open: true, platform });
    setScreenshotFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be under 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setScreenshotFile(file);
    }
  };

  const submitSocialClaim = async () => {
    if (!user || !socialDialog.platform || !screenshotFile) return;
    setUploadingScreenshot(true);

    try {
      // Upload screenshot to Supabase Storage
      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `${user.id}/${socialDialog.platform}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('social-screenshots')
        .upload(fileName, screenshotFile);

      if (uploadError) {
        // If bucket doesn't exist, create it and try again
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('Storage not configured. Please contact support.');
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('social-screenshots')
        .getPublicUrl(fileName);

      const screenshotUrl = urlData.publicUrl;

      // Claim social coins with screenshot
      const { data, error } = await supabase.rpc('claim_social_coins', { 
        _user_id: user.id, 
        _platform: socialDialog.platform 
      });
      
      if (error) throw error;
      
      const result = data as any;
      if (result?.success) {
        // Update with screenshot URL
        await supabase
          .from('social_follows')
          .update({ screenshot_url: screenshotUrl, status: 'pending' })
          .eq('user_id', user.id)
          .eq('platform', socialDialog.platform);

        toast.success(`You earned ${result.coins} Space Coins for following on ${socialDialog.platform}!`);
        setSocialDialog({ open: false, platform: null });
        setScreenshotFile(null);
        fetchData();
      } else {
        toast.error(result?.error || 'Failed to claim social coins');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit claim');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const claimReward = async (reward: Reward) => {
    if (!user || claiming) return;
    
    if ((userCoins?.balance || 0) < reward.coin_cost) {
      toast.error('Not enough coins!');
      return;
    }

    setClaiming(reward.id);

    try {
      // Spend coins
      const { data: spendResult, error: spendError } = await supabase.rpc('spend_coins', {
        _user_id: user.id,
        _amount: reward.coin_cost,
        _source: 'reward_claim',
        _source_id: reward.id,
        _description: `Claimed: ${reward.name}`
      });

      if (spendError) throw spendError;
      if (!spendResult) {
        toast.error('Not enough coins!');
        return;
      }

      // Handle coupon-based rewards
      let couponCode = null;
      let couponId = null;

      if (reward.reward_type === 'discount_30' || reward.reward_type === 'discount_50') {
        // Try to get an available coupon
        const { data: coupon, error: couponError } = await supabase
          .from('coupon_pools')
          .select('*')
          .eq('reward_type', reward.reward_type)
          .eq('status', 'unused')
          .limit(1)
          .maybeSingle();

        if (couponError) throw couponError;

        if (!coupon) {
          toast.error('No coupons available. Please try again later.');
          // Refund coins since no coupon available
          await supabase.rpc('add_coins', {
            _user_id: user.id,
            _amount: reward.coin_cost,
            _source: 'refund',
            _description: 'Refund - No coupon available'
          });
          return;
        }

        // Assign coupon to user
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + reward.expiry_days);

        await supabase
          .from('coupon_pools')
          .update({
            status: 'assigned',
            assigned_to: user.id,
            assigned_email: user.email,
            assigned_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
          })
          .eq('id', coupon.id);

        couponCode = coupon.coupon_code;
        couponId = coupon.id;
      }

      // Create reward claim - fulfilled for coupons, pending only for prop_account
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + reward.expiry_days);

      const claimStatus = reward.reward_type === 'prop_account' ? 'pending' : 'fulfilled';

      await supabase.from('reward_claims').insert({
        user_id: user.id,
        reward_id: reward.id,
        coins_spent: reward.coin_cost,
        status: claimStatus,
        coupon_id: couponId,
        coupon_code: couponCode,
        expires_at: expiresAt.toISOString()
      });

      // Show success dialog for coupon rewards, toast for $10K
      if (reward.reward_type === 'prop_account') {
        toast.success('Your PropScholar $10K Account request has been submitted! You will receive it within 24 hours.');
      } else {
        setSuccessDialog({ open: true, reward, couponCode });
      }
      
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  const copyReferralCode = () => {
    if (userCoins?.referral_code) {
      navigator.clipboard.writeText(`${REFERRAL_DOMAIN}/auth?ref=${userCoins.referral_code}`);
      toast.success('Referral link copied!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'approved': return 'bg-blue-500/20 text-blue-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount_30':
      case 'discount_50':
        return <Percent className="w-6 h-6" />;
      case 'prop_account':
        return <Award className="w-6 h-6" />;
      default:
        return <Gift className="w-6 h-6" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const platforms = ['facebook', 'instagram', 'twitter', 'discord', 'youtube'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              <Coins className="w-10 h-10 text-yellow-500" />
              Space Coins
            </h1>
            <p className="text-muted-foreground">Earn coins and redeem exclusive rewards</p>
          </div>

          {/* Balance Card */}
          <Card className="p-6 bg-gradient-to-br from-yellow-500/10 via-card to-orange-500/10 backdrop-blur-xl border-yellow-500/20">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="text-4xl font-bold text-yellow-500">{userCoins?.balance || 0}</p>
                <p className="text-xs text-muted-foreground">Space Coins</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                <p className="text-2xl font-semibold text-green-400">{userCoins?.total_earned || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                <p className="text-2xl font-semibold text-foreground">{userCoins?.total_spent || 0}</p>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="earn" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="earn">Earn Coins</TabsTrigger>
              <TabsTrigger value="rewards">Claim Rewards</TabsTrigger>
              <TabsTrigger value="claimed">My Rewards</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Earn Coins Tab */}
            <TabsContent value="earn" className="space-y-6">
              {/* Signup Bonus */}
              {settings.signup_coins?.enabled && !userCoins?.signup_coins_claimed && (
                <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-500/20">
                        <Gift className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Welcome Bonus</h3>
                        <p className="text-sm text-muted-foreground">Claim your signup reward</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-500">+{settings.signup_coins?.value || 5}</p>
                      <Button 
                        onClick={claimSignupCoins} 
                        disabled={claimingSignup}
                        className="mt-2 bg-green-600 hover:bg-green-700"
                      >
                        {claimingSignup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim Now'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Social Follows */}
              <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Follow Us & Earn
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Follow us on social media and upload a screenshot to earn coins. Max screenshot size: 2MB.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms.map(platform => {
                    const setting = settings[`social_${platform}`];
                    if (!setting?.enabled) return null;
                    
                    const Icon = platformIcons[platform];
                    const socialFollow = socialFollows.find(f => f.platform === platform);
                    const isFollowed = !!socialFollow;
                    const isPending = socialFollow?.status === 'pending';
                    
                    return (
                      <div 
                        key={platform}
                        className={`p-4 rounded-lg border ${isFollowed ? (isPending ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30') : 'bg-background/50 border-border/30'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${platformColors[platform]}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground capitalize">{platform}</p>
                              <p className="text-xs text-muted-foreground">
                                {isFollowed ? (isPending ? 'Pending Review' : 'Verified') : `+${setting.value} coins`}
                              </p>
                            </div>
                          </div>
                          {isFollowed ? (
                            isPending ? (
                              <Clock className="w-5 h-5 text-yellow-400" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => openSocialDialog(platform)}
                              disabled={claimingSocial === platform}
                              className="flex items-center gap-1"
                            >
                              {claimingSocial === platform ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-3 h-3" />
                                  Upload
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Referral */}
              {settings.referral_coins?.enabled && (
                <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Refer & Earn
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Share your referral link. Earn {settings.referral_coins?.value || 1} coin when your friend signs up using your link!
                  </p>
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 p-3 rounded-lg bg-background/50 border border-border/30 text-sm text-muted-foreground truncate">
                      {`${REFERRAL_DOMAIN}/auth?ref=${userCoins?.referral_code || ''}`}
                    </div>
                    <Button onClick={copyReferralCode} variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  
                  {/* Referred Users */}
                  {referrals.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <h4 className="text-sm font-medium text-foreground mb-3">
                        Users who signed up from your link ({referrals.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {referrals.map(ref => (
                          <div key={ref.id} className="flex items-center justify-between p-2 rounded bg-background/30">
                            <span className="text-sm text-muted-foreground">{ref.referred_email}</span>
                            <span className="text-xs text-green-400">+{ref.coins_rewarded} coins</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Event Participation Info */}
              <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Event Rewards
                </h3>
                <p className="text-sm text-muted-foreground">
                  Participate in blog and reel competitions to earn Space Coins. Win prizes and earn bonus coins!
                </p>
              </Card>
            </TabsContent>

            {/* Rewards Tab */}
            <TabsContent value="rewards" className="space-y-4">
              {rewards.length === 0 ? (
                <Card className="p-12 text-center">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No rewards available at the moment</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards.map(reward => {
                    const userClaimCount = claims.filter(c => c.reward.id === reward.id).length;
                    const canClaim = userClaimCount < (reward.max_claims_per_user || 1);
                    const hasEnoughCoins = (userCoins?.balance || 0) >= reward.coin_cost;
                    const isPropAccount = reward.reward_type === 'prop_account';
                    
                    return (
                      <Card key={reward.id} className="overflow-hidden bg-card/50 backdrop-blur-xl border-border/50">
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                              {getRewardIcon(reward.reward_type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{reward.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {isPropAccount ? 'Delivered within 24 hours' : `Expires in ${reward.expiry_days} days`}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{reward.description}</p>
                          {isPropAccount && (
                            <p className="text-xs text-yellow-500 mb-4">
                              ⚡ You will receive your account within 24 hours after claiming
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Coins className="w-5 h-5 text-yellow-500" />
                              <span className="font-bold text-yellow-500">{reward.coin_cost}</span>
                            </div>
                            <Button
                              onClick={() => claimReward(reward)}
                              disabled={!canClaim || !hasEnoughCoins || claiming === reward.id}
                              className={!canClaim ? 'bg-muted' : ''}
                            >
                              {claiming === reward.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : !canClaim ? (
                                'Already Claimed'
                              ) : !hasEnoughCoins ? (
                                'Not Enough Coins'
                              ) : (
                                'Claim'
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Claimed Rewards Tab */}
            <TabsContent value="claimed" className="space-y-4">
              {claims.length === 0 ? (
                <Card className="p-12 text-center">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No rewards claimed yet</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {claims.map(claim => (
                    <Card key={claim.id} className="p-4 bg-card/50 backdrop-blur-xl border-border/50">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-primary/10 text-primary">
                            {getRewardIcon(claim.reward?.reward_type)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{claim.reward?.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Claimed: {format(new Date(claim.created_at), 'MMM d, yyyy')}
                            </p>
                            {claim.expires_at && (
                              <p className="text-xs text-muted-foreground">
                                Expires: {format(new Date(claim.expires_at), 'MMM d, yyyy')}
                              </p>
                            )}
                            {claim.status === 'pending' && claim.reward?.reward_type === 'prop_account' && (
                              <p className="text-xs text-yellow-500 mt-1">
                                ⏳ Your account will be delivered within 24 hours
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                            {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                          </span>
                          {claim.coupon_code && (
                            <div className="flex items-center gap-2">
                              <code className="px-3 py-1 rounded bg-background/50 text-sm font-mono">
                                {claim.coupon_code}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(claim.coupon_code!);
                                  toast.success('Coupon code copied!');
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <span className="text-sm text-yellow-500">-{claim.coins_spent} coins</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {transactions.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </Card>
              ) : (
                <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                  <div className="divide-y divide-border/50">
                    {transactions.map(tx => (
                      <div key={tx.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${tx.transaction_type === 'earn' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {tx.transaction_type === 'earn' ? (
                              <Coins className="w-4 h-4 text-green-400" />
                            ) : (
                              <Gift className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{tx.description || tx.source}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <span className={`font-semibold ${tx.transaction_type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Social Follow Screenshot Dialog */}
      <Dialog open={socialDialog.open} onOpenChange={(open) => setSocialDialog({ open, platform: open ? socialDialog.platform : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {socialDialog.platform && platformIcons[socialDialog.platform] && (
                (() => {
                  const Icon = platformIcons[socialDialog.platform!];
                  return <Icon className="w-5 h-5" />;
                })()
              )}
              Follow on {socialDialog.platform}
            </DialogTitle>
            <DialogDescription>
              Upload a screenshot showing you followed us to claim your coins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>A new tab opened with our {socialDialog.platform} page</li>
                <li>Follow/Subscribe to our account</li>
                <li>Take a screenshot showing you followed</li>
                <li>Upload the screenshot below (max 2MB)</li>
              </ol>
            </div>
            
            <div>
              <Label>Upload Screenshot (max 2MB)</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {screenshotFile ? (
                  <div className="space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-green-400" />
                    <p className="text-sm text-foreground">{screenshotFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(screenshotFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSocialDialog({ open: false, platform: null })}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={submitSocialClaim}
                disabled={!screenshotFile || uploadingScreenshot}
              >
                {uploadingScreenshot ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Submit & Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog for Coupon Claims */}
      <Dialog open={successDialog.open} onOpenChange={(open) => !open && setSuccessDialog({ open: false, reward: null, couponCode: null })}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-green-400" />
            </div>
            <DialogTitle className="text-2xl">Congratulations! 🎉</DialogTitle>
            <DialogDescription className="text-base">
              You successfully claimed your {successDialog.reward?.name}!
            </DialogDescription>
            
            {successDialog.couponCode && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm text-muted-foreground">Your Coupon Code:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xl font-bold text-foreground bg-background px-4 py-2 rounded">
                    {successDialog.couponCode}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(successDialog.couponCode!);
                      toast.success('Coupon code copied!');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires in {successDialog.reward?.expiry_days} days. One-time use only.
                </p>
              </div>
            )}
            
            <Button onClick={() => setSuccessDialog({ open: false, reward: null, couponCode: null })} className="w-full">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
