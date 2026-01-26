import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Edit, Pause, Play, XCircle, Send, Eye,
  TrendingUp, MousePointer, AlertTriangle, Users, Clock,
  CheckCircle, Mail, TestTube, RefreshCw, BarChart3, Calendar
} from 'lucide-react';
import { format, parseISO, getHours, getDay, startOfHour, subHours } from 'date-fns';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  unsubscribe_count: number;
  spam_count: number;
  html_content: string;
  created_at: string;
}

interface CampaignEvent {
  id: string;
  event_type: string;
  link_url: string | null;
  device_type: string | null;
  country: string | null;
  created_at: string;
  user_agent: string | null;
}

interface CampaignRecipient {
  id: string;
  email: string;
  first_name: string | null;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400' },
  sending: { label: 'Sending', color: 'bg-amber-500/20 text-amber-400' },
  sent: { label: 'Sent', color: 'bg-green-500/20 text-green-400' },
  paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
  failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400' },
};

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminCampaignDetail() {
  const { id } = useParams();
  const { adminNavigate, getLoginPath, getDashboardPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading, email } = useAdminAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');

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


  const { data: campaign, isLoading, refetch: refetchCampaign } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    enabled: hasAccess === true && !!id,
    refetchInterval: (query) => 
      query.state.data?.status === 'sending' ? 5000 : false,
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ['campaign-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_events')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as CampaignEvent[];
    },
    enabled: hasAccess === true && !!campaign && campaign.status !== 'draft',
    refetchInterval: campaign?.status === 'sending' || campaign?.status === 'sent' ? 10000 : false,
  });

  const { data: recipients, refetch: refetchRecipients } = useQuery({
    queryKey: ['campaign-recipients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', id)
        .order('sent_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CampaignRecipient[];
    },
    enabled: hasAccess === true && !!campaign && campaign.status !== 'draft',
    refetchInterval: campaign?.status === 'sending' ? 5000 : false,
  });

  const handleRefresh = () => {
    refetchCampaign();
    refetchEvents();
    refetchRecipients();
    toast.success('Data refreshed');
  };

  // Advanced analytics calculations
  const analytics = useMemo(() => {
    if (!events?.length) return null;

    const openEvents = events.filter(e => e.event_type === 'open');
    const clickEvents = events.filter(e => e.event_type === 'click');

    // Hourly heatmap (0-23 hours)
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

    // Best hour to send
    const bestHourForOpens = hourlyOpens.indexOf(Math.max(...hourlyOpens));
    const bestHourForClicks = hourlyClicks.indexOf(Math.max(...hourlyClicks));

    // Day of week analysis
    const dayOpens: number[] = Array(7).fill(0);
    const dayClicks: number[] = Array(7).fill(0);
    
    openEvents.forEach(e => {
      const day = getDay(parseISO(e.created_at));
      dayOpens[day]++;
    });
    
    clickEvents.forEach(e => {
      const day = getDay(parseISO(e.created_at));
      dayClicks[day]++;
    });

    const bestDayForOpens = dayOpens.indexOf(Math.max(...dayOpens));

    // Device breakdown
    const devices: Record<string, number> = {};
    events.forEach(e => {
      const device = e.device_type || 'unknown';
      devices[device] = (devices[device] || 0) + 1;
    });

    // Timeline data (last 24 hours grouped by hour)
    const timelineData: { time: string; opens: number; clicks: number }[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = startOfHour(subHours(now, i));
      const hourEnd = startOfHour(subHours(now, i - 1));
      const hourLabel = format(hourStart, 'HH:mm');
      
      const opens = openEvents.filter(e => {
        const eventTime = parseISO(e.created_at);
        return eventTime >= hourStart && eventTime < hourEnd;
      }).length;
      
      const clicks = clickEvents.filter(e => {
        const eventTime = parseISO(e.created_at);
        return eventTime >= hourStart && eventTime < hourEnd;
      }).length;
      
      timelineData.push({ time: hourLabel, opens, clicks });
    }

    // Link performance
    const linkPerformance: Record<string, number> = {};
    clickEvents.forEach(e => {
      if (e.link_url) {
        linkPerformance[e.link_url] = (linkPerformance[e.link_url] || 0) + 1;
      }
    });

    // First and last engagement times
    const sortedOpens = [...openEvents].sort((a, b) => 
      parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
    );
    const firstOpen = sortedOpens[0]?.created_at;
    const lastOpen = sortedOpens[sortedOpens.length - 1]?.created_at;

    return {
      hourlyOpens,
      hourlyClicks,
      bestHourForOpens,
      bestHourForClicks,
      dayOpens,
      dayClicks,
      bestDayForOpens,
      devices,
      timelineData,
      linkPerformance,
      firstOpen,
      lastOpen,
      totalOpens: openEvents.length,
      uniqueOpens: campaign?.open_count || 0,
      totalClicks: clickEvents.length,
      uniqueClicks: campaign?.click_count || 0,
    };
  }, [events, campaign]);

  const pauseCampaignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: campaign?.status === 'paused' ? 'sending' : 'paused' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success(campaign?.status === 'paused' ? 'Campaign resumed' : 'Campaign paused');
    },
  });

  const cancelCampaignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success('Campaign cancelled');
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async () => {
      // First, populate campaign_recipients from audience_users if not already done
      const { data: existingRecipients } = await supabase
        .from('campaign_recipients')
        .select('id')
        .eq('campaign_id', id)
        .limit(1);

      if (!existingRecipients?.length) {
        // Get all active audience users
        const { data: audienceUsers, error: audienceError } = await supabase
          .from('audience_users')
          .select('id, email, first_name')
          .eq('is_marketing_allowed', true)
          .is('unsubscribed_at', null);

        if (audienceError) throw audienceError;
        if (!audienceUsers?.length) throw new Error('No active audience users to send to');

        // Create campaign recipients
        const recipients = audienceUsers.map(user => ({
          campaign_id: id!,
          audience_user_id: user.id,
          email: user.email,
          first_name: user.first_name,
          status: 'pending',
          tracking_id: crypto.randomUUID(),
        }));

        const { error: insertError } = await supabase
          .from('campaign_recipients')
          .insert(recipients);
        if (insertError) throw insertError;

        // Update campaign total recipients
        await supabase
          .from('campaigns')
          .update({ total_recipients: recipients.length })
          .eq('id', id);
      }

      // Set campaign to scheduled (will be picked up by queue processor)
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'scheduled', 
          scheduled_at: new Date().toISOString(),
          sender_email: 'info@propscholar.com',
          sender_name: 'PropScholar'
        })
        .eq('id', id);
      if (updateError) throw updateError;

      // Trigger the campaign queue processor
      const { error: invokeError } = await supabase.functions.invoke('process-campaign-queue');
      if (invokeError) console.warn('Queue processor invoke warning:', invokeError);
    },
    onSuccess: () => {
      setShowSendConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success('Campaign is now sending!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send campaign');
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.functions.invoke('send-campaign-test', {
        body: {
          campaignId: id,
          testEmail: email,
          subject: campaign?.subject || 'Test',
          htmlContent: campaign?.html_content || '',
          senderEmail: 'info@propscholar.com',
          senderName: 'PropScholar',
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowTestDialog(false);
      setTestEmail('');
      toast.success('Test email sent successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send test email');
    },
  });

  const restartQueueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('process-campaign-queue');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign queue restarted');
      setTimeout(() => refetchCampaign(), 2000);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restart queue');
    },
  });

  if (isLoading || !campaign) {
    return <div className="min-h-screen bg-background p-6">Loading...</div>;
  }

  const openRate = campaign.sent_count > 0 
    ? ((campaign.open_count / campaign.sent_count) * 100).toFixed(1) 
    : '0';
  const clickRate = campaign.open_count > 0 
    ? ((campaign.click_count / campaign.open_count) * 100).toFixed(1) 
    : '0';
  const clickToSentRate = campaign.sent_count > 0
    ? ((campaign.click_count / campaign.sent_count) * 100).toFixed(1)
    : '0';
  const bounceRate = campaign.sent_count > 0 
    ? ((campaign.bounce_count / campaign.sent_count) * 100).toFixed(1) 
    : '0';
  const deliveryRate = campaign.sent_count > 0 
    ? (((campaign.sent_count - campaign.bounce_count) / campaign.sent_count) * 100).toFixed(1) 
    : '0';

  const progressPercent = campaign.total_recipients > 0 
    ? (campaign.sent_count / campaign.total_recipients) * 100 
    : 0;

  // Hourly heatmap data for chart
  const hourlyChartData = analytics ? 
    analytics.hourlyOpens.map((opens, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      opens,
      clicks: analytics.hourlyClicks[hour],
    })) : [];

  // Day of week data
  const dayChartData = analytics ?
    DAY_NAMES.map((name, i) => ({
      day: name,
      opens: analytics.dayOpens[i],
      clicks: analytics.dayClicks[i],
    })) : [];

  // Device breakdown
  const deviceData = analytics ?
    Object.entries(analytics.devices).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })) : [];

  // Link clicks sorted
  const linkClicks = analytics ?
    Object.entries(analytics.linkPerformance)
      .map(([url, clicks]) => ({ url, clicks }))
      .sort((a, b) => b.clicks - a.clicks) : [];

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
                onClick={() => adminNavigate('/admin/campaigns')}
                className="rounded-full hover:bg-muted/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
                  <Badge className={`${statusConfig[campaign.status]?.color} rounded-full px-3`}>
                    {statusConfig[campaign.status]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{campaign.subject}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {campaign.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => setShowTestDialog(true)}>
                  <TestTube className="w-4 h-4 mr-2" />
                  Send Test
                </Button>
                <Button variant="outline" onClick={() => adminNavigate(`/admin/campaigns/${id}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  onClick={() => setShowSendConfirm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </Button>
              </>
            )}
            {(campaign.status === 'sending' || campaign.status === 'paused') && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => restartQueueMutation.mutate()}
                  disabled={restartQueueMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${restartQueueMutation.isPending ? 'animate-spin' : ''}`} />
                  Restart Queue
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => pauseCampaignMutation.mutate()}
                >
                  {campaign.status === 'paused' ? (
                    <><Play className="w-4 h-4 mr-2" /> Resume</>
                  ) : (
                    <><Pause className="w-4 h-4 mr-2" /> Pause</>
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => cancelCampaignMutation.mutate()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Progress (for sending campaigns) */}
        {campaign.status === 'sending' && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Sending Progress</span>
                <span className="text-sm text-muted-foreground">
                  {campaign.sent_count} / {campaign.total_recipients}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Send className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{campaign.sent_count}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{deliveryRate}%</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{openRate}%</p>
                  <p className="text-xs text-muted-foreground">Opens ({campaign.open_count})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MousePointer className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{clickRate}%</p>
                  <p className="text-xs text-muted-foreground">CTR ({campaign.click_count})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{bounceRate}%</p>
                  <p className="text-xs text-muted-foreground">Bounced ({campaign.bounce_count})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{campaign.unsubscribe_count}</p>
                  <p className="text-xs text-muted-foreground">Unsubscribes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="links">Link Performance</TabsTrigger>
            <TabsTrigger value="content">Email Content</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Engagement Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Engagement Timeline (Last 24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.timelineData?.length ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={analytics.timelineData}>
                        <XAxis dataKey="time" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="opens" 
                          stackId="1"
                          stroke="#6366f1" 
                          fill="#6366f1" 
                          fillOpacity={0.6}
                          name="Opens"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="clicks" 
                          stackId="2"
                          stroke="#22c55e" 
                          fill="#22c55e"
                          fillOpacity={0.6}
                          name="Clicks"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No engagement data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={deviceData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {deviceData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No device data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Engagement Stats */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">First Open</p>
                    <p className="font-semibold">
                      {analytics.firstOpen 
                        ? format(parseISO(analytics.firstOpen), 'MMM d, h:mm a')
                        : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Last Open</p>
                    <p className="font-semibold">
                      {analytics.lastOpen 
                        ? format(parseISO(analytics.lastOpen), 'MMM d, h:mm a')
                        : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Opens</p>
                    <p className="font-semibold">{analytics.totalOpens} ({analytics.uniqueOpens} unique)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Clicks</p>
                    <p className="font-semibold">{analytics.totalClicks} ({analytics.uniqueClicks} unique)</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Campaign Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(campaign.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {campaign.scheduled_at && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Scheduled</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(campaign.scheduled_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  {campaign.started_at && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Send className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">Started Sending</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(campaign.started_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  {campaign.completed_at && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">Completed</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(campaign.completed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            {analytics ? (
              <>
                {/* Best Time Insights */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-6 h-6 text-primary" />
                        <h3 className="font-semibold">Best Hour for Opens</h3>
                      </div>
                      <p className="text-3xl font-bold">{analytics.bestHourForOpens}:00</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analytics.hourlyOpens[analytics.bestHourForOpens]} opens at this hour
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <MousePointer className="w-6 h-6 text-green-500" />
                        <h3 className="font-semibold">Best Hour for Clicks</h3>
                      </div>
                      <p className="text-3xl font-bold">{analytics.bestHourForClicks}:00</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analytics.hourlyClicks[analytics.bestHourForClicks]} clicks at this hour
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-6 h-6 text-purple-500" />
                        <h3 className="font-semibold">Best Day for Opens</h3>
                      </div>
                      <p className="text-3xl font-bold">{DAY_NAMES[analytics.bestDayForOpens]}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analytics.dayOpens[analytics.bestDayForOpens]} opens on this day
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Hourly Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Engagement by Hour of Day
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={hourlyChartData}>
                        <XAxis dataKey="hour" fontSize={10} interval={2} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="opens" fill="#6366f1" name="Opens" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="clicks" fill="#22c55e" name="Clicks" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Day of Week Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement by Day of Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dayChartData}>
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="opens" fill="#6366f1" name="Opens" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="clicks" fill="#22c55e" name="Clicks" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No analytics data available yet. Send the campaign to start tracking.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recipients" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Clicked</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients?.map(recipient => (
                      <TableRow key={recipient.id}>
                        <TableCell className="font-medium">{recipient.email}</TableCell>
                        <TableCell>{recipient.first_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            recipient.status === 'clicked' ? 'default' :
                            recipient.status === 'opened' ? 'secondary' :
                            recipient.status === 'sent' ? 'outline' :
                            recipient.status === 'bounced' ? 'destructive' :
                            recipient.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {recipient.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {recipient.sent_at ? format(new Date(recipient.sent_at), 'MMM d, h:mm a') : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {recipient.opened_at ? format(new Date(recipient.opened_at), 'MMM d, h:mm a') : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {recipient.clicked_at ? format(new Date(recipient.clicked_at), 'MMM d, h:mm a') : '-'}
                        </TableCell>
                        <TableCell className="text-destructive text-xs max-w-[200px] truncate">
                          {recipient.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!recipients?.length && (
                  <div className="text-center py-12 text-muted-foreground">
                    No recipients yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Link Click Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {linkClicks.length > 0 ? (
                  <div className="space-y-4">
                    {linkClicks.map((link, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <MousePointer className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="truncate text-sm">{link.url}</span>
                        </div>
                        <Badge variant="secondary">{link.clicks} clicks</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No link clicks yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white max-w-2xl mx-auto">
                  <iframe
                    srcDoc={campaign.html_content}
                    className="w-full min-h-[500px] border-0"
                    title="Email Content"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Campaign Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the campaign "{campaign.name}" to all active audience members. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendCampaignMutation.mutate()}
              disabled={sendCampaignMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendCampaignMutation.isPending ? 'Sending...' : 'Yes, Send Now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this campaign to preview how it will look.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Subject will be prefixed with [TEST] and variables like {"{{first_name}}"} will show as "Test User".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendTestMutation.mutate(testEmail)}
              disabled={!testEmail || sendTestMutation.isPending}
            >
              {sendTestMutation.isPending ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
