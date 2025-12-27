import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Logo } from '@/components/Logo';
import { AdminLink } from '@/components/AdminLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Coins, Gift, Share2, Users, FileText, Video, Plus, Trash2, Edit2, Percent, Tag, Package } from 'lucide-react';

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
  description: string | null;
  coin_cost: number;
  reward_type: string;
  expiry_days: number | null;
  is_enabled: boolean | null;
  max_claims_per_user: number | null;
}

const REWARD_TYPES = [
  { value: 'discount_10', label: '10% Discount' },
  { value: 'discount_15', label: '15% Discount' },
  { value: 'discount_20', label: '20% Discount' },
  { value: 'discount_25', label: '25% Discount' },
  { value: 'discount_33', label: '33% Discount' },
  { value: 'discount_50', label: '50% Discount' },
  { value: 'free_product', label: 'Free Product' },
  { value: 'bonus_coins', label: 'Bonus Coins' },
  { value: 'early_access', label: 'Early Access' },
  { value: 'exclusive_content', label: 'Exclusive Content' },
  { value: 'custom', label: 'Custom Reward' },
];

export default function AdminRewardSettings() {
  const { getDashboardPath, getLoginPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading } = useAdminAuth();
  const [settings, setSettings] = useState<RewardSetting[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New reward dialog state
  const [showNewRewardDialog, setShowNewRewardDialog] = useState(false);
  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    coin_cost: 10,
    reward_type: 'discount_10',
    expiry_days: 14,
    max_claims_per_user: 1,
    is_enabled: true
  });
  const [creatingReward, setCreatingReward] = useState(false);

  // Edit reward dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Delete confirmation
  const [deletingRewardId, setDeletingRewardId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) return; // useAdminAuth handles redirect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn]);

  const fetchData = async () => {
    try {
      // Use RPC functions to bypass RLS
      const { data: settingsData } = await supabase.rpc('get_all_reward_settings');
      setSettings((settingsData || []).map((s: any) => ({
        ...s,
        setting_value: s.setting_value as RewardSetting['setting_value']
      })));

      const { data: rewardsData } = await supabase.rpc('get_all_rewards');
      setRewards(rewardsData || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
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

  const createReward = async () => {
    if (!newReward.name.trim()) {
      toast.error('Please enter a reward name');
      return;
    }

    setCreatingReward(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_reward', {
        _name: newReward.name,
        _description: newReward.description || '',
        _coin_cost: newReward.coin_cost,
        _reward_type: newReward.reward_type,
        _expiry_days: newReward.expiry_days,
        _max_claims_per_user: newReward.max_claims_per_user,
        _is_enabled: newReward.is_enabled
      });

      if (error) throw error;

      if (data) {
        setRewards(prev => [...prev, data]);
      }
      setShowNewRewardDialog(false);
      setNewReward({
        name: '',
        description: '',
        coin_cost: 10,
        reward_type: 'discount_10',
        expiry_days: 14,
        max_claims_per_user: 1,
        is_enabled: true
      });
      toast.success('Reward created successfully!');
    } catch (error) {
      console.error('Error creating reward:', error);
      toast.error('Failed to create reward');
    } finally {
      setCreatingReward(false);
    }
  };

  const saveEditedReward = async () => {
    if (!editingReward) return;

    try {
      const { error } = await supabase.rpc('admin_update_reward', {
        _id: editingReward.id,
        _name: editingReward.name,
        _description: editingReward.description || '',
        _coin_cost: editingReward.coin_cost,
        _reward_type: editingReward.reward_type,
        _expiry_days: editingReward.expiry_days || 14,
        _max_claims_per_user: editingReward.max_claims_per_user || 1,
        _is_enabled: editingReward.is_enabled ?? true
      });

      if (error) throw error;

      setRewards(prev => prev.map(r => r.id === editingReward.id ? editingReward : r));
      setShowEditDialog(false);
      setEditingReward(null);
      toast.success('Reward updated successfully!');
    } catch (error) {
      console.error('Error updating reward:', error);
      toast.error('Failed to update reward');
    }
  };

  const deleteReward = async (id: string) => {
    try {
      const { error } = await supabase.rpc('admin_delete_reward', { _id: id });

      if (error) throw error;

      setRewards(prev => prev.filter(r => r.id !== id));
      setDeletingRewardId(null);
      toast.success('Reward deleted successfully!');
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error('Failed to delete reward');
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save settings using RPC
      for (const setting of settings) {
        await supabase.rpc('admin_update_reward_setting', {
          _id: setting.id,
          _setting_value: setting.setting_value
        });
      }

      // Save rewards using RPC
      for (const reward of rewards) {
        await supabase.rpc('admin_update_reward', {
          _id: reward.id,
          _name: reward.name,
          _description: reward.description || '',
          _coin_cost: reward.coin_cost,
          _reward_type: reward.reward_type,
          _expiry_days: reward.expiry_days || 14,
          _max_claims_per_user: reward.max_claims_per_user || 1,
          _is_enabled: reward.is_enabled ?? true
        });
      }

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const signupSetting = settings.find(s => s.setting_key === 'signup_coins');
  const referralSetting = settings.find(s => s.setting_key === 'referral_coins');
  const blogParticipationSetting = settings.find(s => s.setting_key === 'participation_blog');
  const reelParticipationSetting = settings.find(s => s.setting_key === 'participation_reel');
  const socialSettings = settings.filter(s => s.setting_key.startsWith('social_'));

  const getRewardTypeIcon = (type: string) => {
    if (type.startsWith('discount_')) return <Percent className="w-4 h-4" />;
    if (type === 'free_product') return <Package className="w-4 h-4" />;
    if (type === 'bonus_coins') return <Coins className="w-4 h-4" />;
    return <Tag className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AdminLink to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </AdminLink>
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
          <p className="text-muted-foreground">Configure Space Coin earning rules and rewards catalog</p>
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
              <CardDescription>Coins when someone joins using referral link</CardDescription>
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

        {/* Participation Coin Settings */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Blog Participation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                Blog Participation Coins
              </CardTitle>
              <CardDescription>Coins awarded when user submits a blog entry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Blog Participation Coins</Label>
                <Switch
                  checked={blogParticipationSetting?.setting_value?.enabled || false}
                  onCheckedChange={(checked) => updateSetting('participation_blog', 'enabled', checked)}
                />
              </div>
              <div>
                <Label>Coin Value</Label>
                <Input
                  type="number"
                  value={blogParticipationSetting?.setting_value?.value || 0}
                  onChange={(e) => updateSetting('participation_blog', 'value', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Reel Participation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-pink-400" />
                Reel Participation Coins
              </CardTitle>
              <CardDescription>Coins awarded when user submits a reel entry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Reel Participation Coins</Label>
                <Switch
                  checked={reelParticipationSetting?.setting_value?.enabled || false}
                  onCheckedChange={(checked) => updateSetting('participation_reel', 'enabled', checked)}
                />
              </div>
              <div>
                <Label>Coin Value</Label>
                <Input
                  type="number"
                  value={reelParticipationSetting?.setting_value?.value || 0}
                  onChange={(e) => updateSetting('participation_reel', 'value', parseInt(e.target.value) || 0)}
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

        {/* Rewards Catalog - Full CRUD */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  Rewards Catalog
                </CardTitle>
                <CardDescription>Create, edit, and manage redeemable rewards</CardDescription>
              </div>
              <Dialog open={showNewRewardDialog} onOpenChange={setShowNewRewardDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Reward
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Reward</DialogTitle>
                    <DialogDescription>Add a new reward to the catalog</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Reward Name</Label>
                      <Input
                        placeholder="e.g., 33% Discount Coupon"
                        value={newReward.name}
                        onChange={(e) => setNewReward(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe what the user gets..."
                        value={newReward.description}
                        onChange={(e) => setNewReward(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Reward Type</Label>
                        <Select
                          value={newReward.reward_type}
                          onValueChange={(value) => setNewReward(prev => ({ ...prev, reward_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REWARD_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Coin Cost</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newReward.coin_cost}
                          onChange={(e) => setNewReward(prev => ({ ...prev, coin_cost: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expiry Days</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newReward.expiry_days}
                          onChange={(e) => setNewReward(prev => ({ ...prev, expiry_days: parseInt(e.target.value) || 14 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Claims/User</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newReward.max_claims_per_user}
                          onChange={(e) => setNewReward(prev => ({ ...prev, max_claims_per_user: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Enable Reward</Label>
                      <Switch
                        checked={newReward.is_enabled}
                        onCheckedChange={(checked) => setNewReward(prev => ({ ...prev, is_enabled: checked }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewRewardDialog(false)}>Cancel</Button>
                    <Button onClick={createReward} disabled={creatingReward}>
                      {creatingReward ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Create Reward
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No rewards created yet</p>
                <p className="text-sm">Click "Add Reward" to create your first reward</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rewards.map(reward => (
                  <div key={reward.id} className="p-4 rounded-lg border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${reward.is_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {getRewardTypeIcon(reward.reward_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{reward.name}</h4>
                            {!reward.is_enabled && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Disabled</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{reward.description || 'No description'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              {reward.coin_cost} coins
                            </span>
                            <span>Expires: {reward.expiry_days} days</span>
                            <span>Max: {reward.max_claims_per_user}/user</span>
                            <span className="capitalize">{reward.reward_type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reward.is_enabled ?? true}
                          onCheckedChange={(checked) => updateReward(reward.id, 'is_enabled', checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingReward(reward);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Dialog open={deletingRewardId === reward.id} onOpenChange={(open) => !open && setDeletingRewardId(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingRewardId(reward.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Reward</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete "{reward.name}"? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeletingRewardId(null)}>Cancel</Button>
                              <Button variant="destructive" onClick={() => deleteReward(reward.id)}>Delete</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Reward Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Reward</DialogTitle>
              <DialogDescription>Update reward details</DialogDescription>
            </DialogHeader>
            {editingReward && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Reward Name</Label>
                  <Input
                    value={editingReward.name}
                    onChange={(e) => setEditingReward(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingReward.description || ''}
                    onChange={(e) => setEditingReward(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reward Type</Label>
                    <Select
                      value={editingReward.reward_type}
                      onValueChange={(value) => setEditingReward(prev => prev ? { ...prev, reward_type: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REWARD_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coin Cost</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingReward.coin_cost}
                      onChange={(e) => setEditingReward(prev => prev ? { ...prev, coin_cost: parseInt(e.target.value) || 1 } : null)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Days</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingReward.expiry_days || 14}
                      onChange={(e) => setEditingReward(prev => prev ? { ...prev, expiry_days: parseInt(e.target.value) || 14 } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Claims/User</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingReward.max_claims_per_user || 1}
                      onChange={(e) => setEditingReward(prev => prev ? { ...prev, max_claims_per_user: parseInt(e.target.value) || 1 } : null)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable Reward</Label>
                  <Switch
                    checked={editingReward.is_enabled ?? true}
                    onCheckedChange={(checked) => setEditingReward(prev => prev ? { ...prev, is_enabled: checked } : null)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={saveEditedReward}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}