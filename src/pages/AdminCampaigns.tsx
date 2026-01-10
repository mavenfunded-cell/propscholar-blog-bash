import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Users, Plus, Eye, Copy,
  Calendar, CheckCircle, Clock, Pause, XCircle,
  TrendingUp, MousePointer, AlertTriangle, ArrowLeft,
  Sparkles, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  total_recipients: number;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft: { label: 'Draft', color: 'bg-muted/80 text-muted-foreground border border-border', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30', icon: Calendar },
  sending: { label: 'Sending', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30', icon: Send },
  sent: { label: 'Sent', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', icon: CheckCircle },
  paused: { label: 'Paused', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/30', icon: Pause },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border border-red-500/30', icon: XCircle },
};

export default function AdminCampaigns() {
  const { adminNavigate, getDashboardPath, getLoginPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading, email } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      setHasAccess(false);
      adminNavigate(getLoginPath());
      return;
    }

    if (!email) {
      setHasAccess(false);
      adminNavigate(getLoginPath());
      return;
    }

    const checkCampaignAccess = async () => {
      const { data: accessData, error } = await supabase
        .from('admin_campaign_access')
        .select('has_access')
        .eq('admin_email', email)
        .eq('has_access', true)
        .maybeSingle();

      if (error) {
        setHasAccess(false);
        adminNavigate(getDashboardPath());
        return;
      }

      const ok = !!accessData;
      setHasAccess(ok);
      if (!ok) adminNavigate(getDashboardPath());
    };

    checkCampaignAccess();
  }, [adminNavigate, authLoading, email, getDashboardPath, getLoginPath, isLoggedIn]);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: hasAccess === true,
  });


  const { data: audienceCount } = useQuery({
    queryKey: ['audience-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('audience_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_marketing_allowed', true)
        .is('unsubscribed_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: hasAccess === true,
  });

  const stats = {
    total: campaigns?.length || 0,
    draft: campaigns?.filter(c => c.status === 'draft').length || 0,
    scheduled: campaigns?.filter(c => c.status === 'scheduled').length || 0,
    sent: campaigns?.filter(c => c.status === 'sent').length || 0,
    totalOpens: campaigns?.reduce((sum, c) => sum + c.open_count, 0) || 0,
    totalClicks: campaigns?.reduce((sum, c) => sum + c.click_count, 0) || 0,
    totalSent: campaigns?.reduce((sum, c) => sum + c.sent_count, 0) || 0,
    totalBounces: campaigns?.reduce((sum, c) => sum + c.bounce_count, 0) || 0,
  };

  const openRate = stats.totalSent > 0 ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1) : '0';
  const clickRate = stats.totalOpens > 0 ? ((stats.totalClicks / stats.totalOpens) * 100).toFixed(1) : '0';
  const bounceRate = stats.totalSent > 0 ? ((stats.totalBounces / stats.totalSent) * 100).toFixed(1) : '0';

  const filteredCampaigns = campaigns?.filter(c => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  });

  const handleDuplicate = async (campaign: Campaign) => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        name: `${campaign.name} (Copy)`,
        subject: campaign.subject,
        html_content: '<p>Enter content</p>',
      }])
      .select()
      .single();

    if (!error && data) {
      adminNavigate(`/admin/campaigns/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => adminNavigate(getDashboardPath())}
                className="rounded-full hover:bg-muted/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Email Campaigns</h1>
                <p className="text-sm text-muted-foreground">
                  Create and manage your marketing campaigns
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => adminNavigate('/admin/campaigns/audience')}
                className="rounded-lg border-border/50 hover:bg-muted/50"
              >
                <Users className="w-4 h-4 mr-2" />
                Audience
                <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0 text-xs">
                  {audienceCount}
                </Badge>
              </Button>
              <Button 
                onClick={() => adminNavigate('/admin/campaigns/new')}
                className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatsCard
            icon={Mail}
            value={stats.total}
            label="Total Campaigns"
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <StatsCard
            icon={Clock}
            value={stats.draft}
            label="Drafts"
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
          />
          <StatsCard
            icon={Calendar}
            value={stats.scheduled}
            label="Scheduled"
            iconBg="bg-blue-500/10"
            iconColor="text-blue-400"
          />
          <StatsCard
            icon={TrendingUp}
            value={`${openRate}%`}
            label="Open Rate"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-400"
          />
          <StatsCard
            icon={MousePointer}
            value={`${clickRate}%`}
            label="Click Rate"
            iconBg="bg-violet-500/10"
            iconColor="text-violet-400"
          />
          <StatsCard
            icon={AlertTriangle}
            value={`${bounceRate}%`}
            label="Bounce Rate"
            iconBg="bg-red-500/10"
            iconColor="text-red-400"
          />
        </div>

        {/* Campaigns List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="border-b border-border/50 p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-background">
                  All ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="draft" className="data-[state=active]:bg-background">
                  Draft ({stats.draft})
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="data-[state=active]:bg-background">
                  Scheduled ({stats.scheduled})
                </TabsTrigger>
                <TabsTrigger value="sent" className="data-[state=active]:bg-background">
                  Sent ({stats.sent})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredCampaigns?.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create your first email campaign to start engaging with your audience
                </p>
                <Button 
                  onClick={() => adminNavigate('/admin/campaigns/new')}
                  className="rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredCampaigns?.map(campaign => {
                  const StatusIcon = statusConfig[campaign.status]?.icon || Clock;
                  const campaignOpenRate = campaign.sent_count > 0 
                    ? ((campaign.open_count / campaign.sent_count) * 100).toFixed(1) 
                    : '0';
                  const campaignClickRate = campaign.open_count > 0 
                    ? ((campaign.click_count / campaign.open_count) * 100).toFixed(1) 
                    : '0';

                  return (
                    <div 
                      key={campaign.id}
                      className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => adminNavigate(`/admin/campaigns/${campaign.id}`)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                            {campaign.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {campaign.subject}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {campaign.status === 'sent' && (
                          <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-medium tabular-nums">{campaign.sent_count}</p>
                              <p className="text-xs text-muted-foreground">Sent</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium tabular-nums text-emerald-400">{campaignOpenRate}%</p>
                              <p className="text-xs text-muted-foreground">Opens</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium tabular-nums text-violet-400">{campaignClickRate}%</p>
                              <p className="text-xs text-muted-foreground">Clicks</p>
                            </div>
                          </div>
                        )}

                        <Badge className={`${statusConfig[campaign.status]?.color} rounded-full px-3`}>
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {statusConfig[campaign.status]?.label}
                        </Badge>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-8 w-8 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              adminNavigate(`/admin/campaigns/${campaign.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-8 w-8 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(campaign);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatsCard({ 
  icon: Icon, 
  value, 
  label, 
  iconBg, 
  iconColor 
}: { 
  icon: React.ComponentType<any>; 
  value: string | number; 
  label: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
