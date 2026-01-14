import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Users, Plus, Eye, Copy,
  Calendar, CheckCircle, Clock, Pause, XCircle,
  TrendingUp, MousePointer, AlertTriangle, ArrowLeft,
  Sparkles, Send, Zap, BarChart3, ExternalLink,
  MailOpen, Target, Ban, UserMinus
} from 'lucide-react';
import { format, parseISO, getHours, getDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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
  unsubscribe_count?: number;
  total_recipients: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface CampaignEvent {
  event_type: string;
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminCampaigns() {
  const { adminNavigate, getDashboardPath, getLoginPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading, email } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showStatsPopup, setShowStatsPopup] = useState(false);

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

  // Fetch all campaign events for analytics
  const { data: allEvents } = useQuery({
    queryKey: ['all-campaign-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_events')
        .select('event_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      return data as CampaignEvent[];
    },
    enabled: hasAccess === true,
  });

  // Calculate best send time analytics
  const sendTimeAnalytics = useMemo(() => {
    if (!allEvents?.length) return null;

    const openEvents = allEvents.filter(e => e.event_type === 'open');
    const clickEvents = allEvents.filter(e => e.event_type === 'click');

    // Hourly analysis
    const hourlyOpens: number[] = Array(24).fill(0);
    const hourlyClicks: number[] = Array(24).fill(0);

    openEvents.forEach(e => {
      const hour = getHours(parseISO(e.created_at));
      hourlyOpens[hour]++;
    });

    clickEvents.forEach(e => {
      const hour = getHours(parseISO(e.created_at));
      hourlyClicks[hour]++;
    });

    // Day of week analysis
    const dayOpens: number[] = Array(7).fill(0);

    openEvents.forEach(e => {
      const day = getDay(parseISO(e.created_at));
      dayOpens[day]++;
    });

    const bestHourIndex = hourlyOpens.indexOf(Math.max(...hourlyOpens));
    const bestDayIndex = dayOpens.indexOf(Math.max(...dayOpens));

    // Hourly chart data
    const hourlyData = hourlyOpens.map((opens, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      opens,
      clicks: hourlyClicks[hour],
    }));

    // Day chart data
    const dayData = DAY_NAMES.map((name, i) => ({
      day: name,
      opens: dayOpens[i],
    }));

    return {
      bestHour: bestHourIndex,
      bestDay: DAY_NAMES[bestDayIndex],
      bestDayIndex,
      hourlyData,
      dayData,
      totalOpens: openEvents.length,
      totalClicks: clickEvents.length,
      hourlyOpens,
      dayOpens,
    };
  }, [allEvents]);


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
        {/* Best Send Time Recommendation */}
        {sendTimeAnalytics && sendTimeAnalytics.totalOpens > 10 && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Best Time to Send
                      <Badge variant="secondary" className="text-xs">AI Recommended</Badge>
                    </h3>
                    <p className="text-muted-foreground">
                      Based on {sendTimeAnalytics.totalOpens} email opens analyzed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {sendTimeAnalytics.bestHour}:00
                    </p>
                    <p className="text-xs text-muted-foreground">Best Hour</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {sendTimeAnalytics.bestDay}
                    </p>
                    <p className="text-xs text-muted-foreground">Best Day</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="ml-4"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {showAnalytics ? 'Hide' : 'View'} Analytics
                  </Button>
                </div>
              </div>

              {showAnalytics && (
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-sm">Opens by Hour of Day</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={sendTimeAnalytics.hourlyData}>
                        <XAxis dataKey="hour" fontSize={9} interval={3} />
                        <YAxis fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="opens" radius={[2, 2, 0, 0]}>
                          {sendTimeAnalytics.hourlyData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === sendTimeAnalytics.bestHour ? '#6366f1' : '#6366f140'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 text-sm">Opens by Day of Week</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={sendTimeAnalytics.dayData}>
                        <XAxis dataKey="day" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="opens" radius={[4, 4, 0, 0]}>
                          {sendTimeAnalytics.dayData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === sendTimeAnalytics.bestDayIndex ? '#22c55e' : '#22c55e40'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            type="button"
                            size="icon" 
                            variant="ghost"
                            className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCampaign(campaign);
                              setShowStatsPopup(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Campaign Stats Card Overlay */}
        {showStatsPopup && selectedCampaign && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
              onClick={() => setShowStatsPopup(false)}
            />
            
            {/* Card Popup */}
            <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto border-border/50 bg-card shadow-2xl shadow-black/50 animate-in zoom-in-95 fade-in duration-200">
              {/* Close button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full hover:bg-muted"
                onClick={() => setShowStatsPopup(false)}
              >
                <XCircle className="w-5 h-5" />
              </Button>

              {/* Header with gradient */}
              <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-b border-border/50">
                <div className="flex items-start justify-between pr-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                      <Mail className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-1">
                        {selectedCampaign.name}
                      </h2>
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {selectedCampaign.subject}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${statusConfig[selectedCampaign.status]?.color} rounded-full px-3 py-1`}>
                    {statusConfig[selectedCampaign.status]?.label}
                  </Badge>
                </div>
              </div>

              {/* Stats Grid */}
              <CardContent className="p-6 space-y-6">
                {/* Main Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatMetricCard
                    icon={Send}
                    value={selectedCampaign.sent_count}
                    label="Sent"
                    color="blue"
                    percentage={100}
                  />
                  <StatMetricCard
                    icon={MailOpen}
                    value={selectedCampaign.open_count}
                    label="Opened"
                    color="emerald"
                    percentage={selectedCampaign.sent_count > 0 
                      ? (selectedCampaign.open_count / selectedCampaign.sent_count) * 100 
                      : 0}
                  />
                  <StatMetricCard
                    icon={MousePointer}
                    value={selectedCampaign.click_count}
                    label="Clicked"
                    color="violet"
                    percentage={selectedCampaign.open_count > 0 
                      ? (selectedCampaign.click_count / selectedCampaign.open_count) * 100 
                      : 0}
                  />
                  <StatMetricCard
                    icon={Ban}
                    value={selectedCampaign.bounce_count}
                    label="Bounced"
                    color="red"
                    percentage={selectedCampaign.sent_count > 0 
                      ? (selectedCampaign.bounce_count / selectedCampaign.sent_count) * 100 
                      : 0}
                  />
                </div>

                {/* Engagement Funnel */}
                <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Engagement Funnel
                  </h4>
                  <div className="space-y-3">
                    <FunnelBar 
                      label="Delivered" 
                      value={selectedCampaign.sent_count - selectedCampaign.bounce_count}
                      max={selectedCampaign.sent_count}
                      color="bg-blue-500"
                    />
                    <FunnelBar 
                      label="Opened" 
                      value={selectedCampaign.open_count}
                      max={selectedCampaign.sent_count}
                      color="bg-emerald-500"
                    />
                    <FunnelBar 
                      label="Clicked" 
                      value={selectedCampaign.click_count}
                      max={selectedCampaign.sent_count}
                      color="bg-violet-500"
                    />
                  </div>
                </div>

                {/* Quick Rates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-3xl font-bold text-emerald-400 tabular-nums">
                      {selectedCampaign.sent_count > 0 
                        ? ((selectedCampaign.open_count / selectedCampaign.sent_count) * 100).toFixed(1) 
                        : '0'}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Open Rate</p>
                  </div>
                  <div className="text-center p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <p className="text-3xl font-bold text-violet-400 tabular-nums">
                      {selectedCampaign.open_count > 0 
                        ? ((selectedCampaign.click_count / selectedCampaign.open_count) * 100).toFixed(1) 
                        : '0'}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Click Rate</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="text-3xl font-bold text-red-400 tabular-nums">
                      {selectedCampaign.sent_count > 0 
                        ? ((selectedCampaign.bounce_count / selectedCampaign.sent_count) * 100).toFixed(1) 
                        : '0'}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Bounce Rate</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(selectedCampaign.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowStatsPopup(false)}
                      className="rounded-lg"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setShowStatsPopup(false);
                        adminNavigate(`/admin/campaigns/${selectedCampaign.id}`);
                      }}
                      className="rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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

// Stat metric card for popup
function StatMetricCard({ 
  icon: Icon, 
  value, 
  label, 
  color,
  percentage
}: { 
  icon: React.ComponentType<any>; 
  value: number; 
  label: string;
  color: 'blue' | 'emerald' | 'violet' | 'red';
  percentage: number;
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20',
    },
    violet: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      iconBg: 'bg-violet-500/20',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      iconBg: 'bg-red-500/20',
    },
  };

  const colors = colorMap[color];

  return (
    <div className={`p-4 rounded-xl ${colors.bg} border ${colors.border} relative overflow-hidden`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${colors.text}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-1">
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
}

// Funnel bar for engagement visualization
function FunnelBar({ 
  label, 
  value, 
  max, 
  color 
}: { 
  label: string; 
  value: number; 
  max: number; 
  color: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value.toLocaleString()} <span className="text-muted-foreground text-xs">({percentage.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percentage, 0)}%` }}
        />
      </div>
    </div>
  );
}
