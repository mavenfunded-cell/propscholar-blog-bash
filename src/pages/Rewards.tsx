import { useEffect, useState } from 'react';
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
  Award
} from 'lucide-react';
import { format } from 'date-fns';

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

export default function Rewards() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [settings, setSettings] = useState<RewardSettings>({});
  const [socialFollows, setSocialFollows] = useState<SocialFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimingSocial, setClaimingSocial] = useState<string | null>(null);
  const [claimingSignup, setClaimingSignup] = useState(false);

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
        // Create user_coins record if doesn't exist
        const { data: newCoins } = await supabase
          .from('user_coins')
          .insert({ user_id: user.id, email: user.email || '' })
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
        .select('platform')
        .eq('user_id', user.id);

      setSocialFollows(followsData || []);
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

  const claimSocialCoins = async (platform: string) => {
    if (!user || claimingSocial) return;
    setClaimingSocial(platform);

    try {
      // Open social link
      const socialSetting = settings[`social_${platform}`];
      if (socialSetting?.url) {
        window.open(socialSetting.url, '_blank');
      }

      const { data, error } = await supabase.rpc('claim_social_coins', { 
        _user_id: user.id, 
        _platform: platform 
      });
      
      if (error) throw error;
      
      const result = data as any;
      if (result?.success) {
        toast.success(`You earned ${result.coins} Space Coins for following on ${platform}!`);
        fetchData();
      } else {
        toast.error(result?.error || 'Failed to claim social coins');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim social coins');
    } finally {
      setClaimingSocial(null);
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

        if (coupon) {
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
      }

      // Create reward claim
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + reward.expiry_days);

      await supabase.from('reward_claims').insert({
        user_id: user.id,
        reward_id: reward.id,
        coins_spent: reward.coin_cost,
        status: reward.reward_type === 'prop_account' ? 'pending' : (couponCode ? 'fulfilled' : 'pending'),
        coupon_id: couponId,
        coupon_code: couponCode,
        expires_at: expiresAt.toISOString()
      });

      toast.success(`Successfully claimed ${reward.name}!`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  const copyReferralCode = () => {
    if (userCoins?.referral_code) {
      navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${userCoins.referral_code}`);
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
  const followedPlatforms = socialFollows.map(f => f.platform);

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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms.map(platform => {
                    const setting = settings[`social_${platform}`];
                    if (!setting?.enabled) return null;
                    
                    const Icon = platformIcons[platform];
                    const isFollowed = followedPlatforms.includes(platform);
                    
                    return (
                      <div 
                        key={platform}
                        className={`p-4 rounded-lg border ${isFollowed ? 'bg-green-500/10 border-green-500/30' : 'bg-background/50 border-border/30'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${platformColors[platform]}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground capitalize">{platform}</p>
                              <p className="text-xs text-muted-foreground">
                                {isFollowed ? 'Claimed' : `+${setting.value} coins`}
                              </p>
                            </div>
                          </div>
                          {isFollowed ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => claimSocialCoins(platform)}
                              disabled={claimingSocial === platform || !setting.url}
                            >
                              {claimingSocial === platform ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  Follow
                                  <ExternalLink className="w-3 h-3 ml-1" />
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
                    Share your referral link. Earn {settings.referral_coins?.value || 1} coin when your friend participates in an approved blog.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 rounded-lg bg-background/50 border border-border/30 text-sm text-muted-foreground truncate">
                      {`${window.location.origin}/auth?ref=${userCoins?.referral_code || ''}`}
                    </div>
                    <Button onClick={copyReferralCode} variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
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
                    
                    return (
                      <Card key={reward.id} className="overflow-hidden bg-card/50 backdrop-blur-xl border-border/50">
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                              {getRewardIcon(reward.reward_type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{reward.name}</h3>
                              <p className="text-xs text-muted-foreground">Expires in {reward.expiry_days} days</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{reward.description}</p>
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
    </div>
  );
}