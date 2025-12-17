import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Coins, Gift, Share2, Users } from 'lucide-react';

interface RewardSetting {
  id: string;
  setting_key: string;
  setting_value: {
    enabled: boolean;
    value: number;
    url?: string;
  };
}

interface Reward {
  id: string;
  name: string;
  description: string;
  coin_cost: number;
  reward_type: string;
  expiry_days: number;
  is_enabled: boolean;
  max_claims_per_user: number;
}

export default function AdminRewardSettings() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RewardSetting[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const { data: settingsData } = await supabase
        .from('reward_settings')
        .select('*')
        .order('setting_key');

      setSettings((settingsData || []).map((s: any) => ({
        ...s,
        setting_value: s.setting_value as RewardSetting['setting_value']
      })));

      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .order('coin_cost');

      setRewards(rewardsData || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateSetting = (key: string, field: string, value: any) => {
    setSettings(prev => prev.map(s => {
      if (s.setting_key === key) {
        return {
          ...s,
          setting_value: {
            ...s.setting_value,
            [field]: value
          }
        };
      }
      return s;
    }));
  };

  const updateReward = (id: string, field: string, value: any) => {
    setRewards(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save settings
      for (const setting of settings) {
        await supabase
          .from('reward_settings')
          .update({ 
            setting_value: setting.setting_value,
            updated_by: user?.id 
          })
          .eq('id', setting.id);
      }

      // Save rewards
      for (const reward of rewards) {
        await supabase
          .from('rewards')
          .update({
            name: reward.name,
            description: reward.description,
            coin_cost: reward.coin_cost,
            expiry_days: reward.expiry_days,
            is_enabled: reward.is_enabled,
            max_claims_per_user: reward.max_claims_per_user
          })
          .eq('id', reward.id);
      }

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const signupSetting = settings.find(s => s.setting_key === 'signup_coins');
  const referralSetting = settings.find(s => s.setting_key === 'referral_coins');
  const socialSettings = settings.filter(s => s.setting_key.startsWith('social_'));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Logo />
          </div>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save All
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reward Settings</h1>
          <p className="text-muted-foreground">Configure Space Coin earning rules and rewards</p>
        </div>

        {/* Coin Earning Settings */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Signup Coins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-400" />
                Signup Bonus
              </CardTitle>
              <CardDescription>Coins awarded on account creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Signup Bonus</Label>
                <Switch
                  checked={signupSetting?.setting_value?.enabled || false}
                  onCheckedChange={(checked) => updateSetting('signup_coins', 'enabled', checked)}
                />
              </div>
              <div>
                <Label>Coin Value</Label>
                <Input
                  type="number"
                  value={signupSetting?.setting_value?.value || 0}
                  onChange={(e) => updateSetting('signup_coins', 'value', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Referral Coins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Referral Bonus
              </CardTitle>
              <CardDescription>Coins when referred user submits approved blog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Referral Bonus</Label>
                <Switch
                  checked={referralSetting?.setting_value?.enabled || false}
                  onCheckedChange={(checked) => updateSetting('referral_coins', 'enabled', checked)}
                />
              </div>
              <div>
                <Label>Coin Value</Label>
                <Input
                  type="number"
                  value={referralSetting?.setting_value?.value || 0}
                  onChange={(e) => updateSetting('referral_coins', 'value', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Follow Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-400" />
              Social Follow Rewards
            </CardTitle>
            <CardDescription>Configure coins for following social media</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {socialSettings.map(setting => {
                const platform = setting.setting_key.replace('social_', '');
                return (
                  <div key={setting.id} className="p-4 rounded-lg border border-border/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize font-semibold">{platform}</Label>
                      <Switch
                        checked={setting.setting_value?.enabled || false}
                        onCheckedChange={(checked) => updateSetting(setting.setting_key, 'enabled', checked)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Coins</Label>
                      <Input
                        type="number"
                        value={setting.setting_value?.value || 0}
                        onChange={(e) => updateSetting(setting.setting_key, 'value', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">URL</Label>
                      <Input
                        type="url"
                        placeholder={`https://${platform}.com/propscholar`}
                        value={setting.setting_value?.url || ''}
                        onChange={(e) => updateSetting(setting.setting_key, 'url', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rewards Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Rewards Catalog
            </CardTitle>
            <CardDescription>Configure available rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {rewards.map(reward => (
                <div key={reward.id} className="p-4 rounded-lg border border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{reward.name}</h4>
                    <Switch
                      checked={reward.is_enabled}
                      onCheckedChange={(checked) => updateReward(reward.id, 'is_enabled', checked)}
                    />
                  </div>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Coin Cost</Label>
                      <Input
                        type="number"
                        value={reward.coin_cost}
                        onChange={(e) => updateReward(reward.id, 'coin_cost', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expiry Days</Label>
                      <Input
                        type="number"
                        value={reward.expiry_days}
                        onChange={(e) => updateReward(reward.id, 'expiry_days', parseInt(e.target.value) || 14)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max Claims/User</Label>
                      <Input
                        type="number"
                        value={reward.max_claims_per_user}
                        onChange={(e) => updateReward(reward.id, 'max_claims_per_user', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={reward.description || ''}
                        onChange={(e) => updateReward(reward.id, 'description', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}