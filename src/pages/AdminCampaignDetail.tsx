import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Edit, Pause, Play, XCircle, Send, Eye,
  TrendingUp, MousePointer, AlertTriangle, Users, Clock,
  CheckCircle, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
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
}

interface CampaignRecipient {
  id: string;
  email: string;
  first_name: string | null;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400' },
  sending: { label: 'Sending', color: 'bg-amber-500/20 text-amber-400' },
  sent: { label: 'Sent', color: 'bg-green-500/20 text-green-400' },
  paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
};

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

export default function AdminCampaignDetail() {
  const { id } = useParams();
  const { adminNavigate, getLoginPath, getDashboardPath } = useAdminNavigation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setHasAccess(false);
        adminNavigate(getLoginPath());
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        setHasAccess(false);
        adminNavigate(getLoginPath());
        return;
      }

      const { data: accessData } = await supabase
        .from('admin_campaign_access')
        .select('has_access')
        .eq('admin_email', session.user.email ?? '')
        .eq('has_access', true)
        .maybeSingle();

      const ok = !!accessData;
      setHasAccess(ok);
      if (!ok) adminNavigate(getDashboardPath());
    };

    checkAccess();
  }, [adminNavigate, getDashboardPath, getLoginPath]);

  const { data: campaign, isLoading } = useQuery({
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
  });

  const { data: events } = useQuery({
    queryKey: ['campaign-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_events')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CampaignEvent[];
    },
    enabled: hasAccess === true && !!campaign && campaign.status !== 'draft',
  });

  const { data: recipients } = useQuery({
    queryKey: ['campaign-recipients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', id)
        .order('sent_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CampaignRecipient[];
    },
    enabled: hasAccess === true && !!campaign && campaign.status !== 'draft',
  });

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

  if (isLoading || !campaign) {
    return <div className="min-h-screen bg-background p-6">Loading...</div>;
  }

  const openRate = campaign.sent_count > 0 
    ? ((campaign.open_count / campaign.sent_count) * 100).toFixed(1) 
    : '0';
  const clickRate = campaign.open_count > 0 
    ? ((campaign.click_count / campaign.open_count) * 100).toFixed(1) 
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

  // Group events by hour for chart
  const hourlyData = events?.reduce((acc, event) => {
    const hour = format(new Date(event.created_at), 'HH:00');
    const existing = acc.find(d => d.hour === hour);
    if (existing) {
      if (event.event_type === 'open') existing.opens++;
      if (event.event_type === 'click') existing.clicks++;
    } else {
      acc.push({
        hour,
        opens: event.event_type === 'open' ? 1 : 0,
        clicks: event.event_type === 'click' ? 1 : 0,
      });
    }
    return acc;
  }, [] as { hour: string; opens: number; clicks: number }[]) || [];

  // Device breakdown
  const deviceData = events?.reduce((acc, event) => {
    const device = event.device_type || 'Unknown';
    const existing = acc.find(d => d.name === device);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: device, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  // Link clicks
  const linkClicks = events
    ?.filter(e => e.event_type === 'click' && e.link_url)
    .reduce((acc, event) => {
      const url = event.link_url!;
      const existing = acc.find(l => l.url === url);
      if (existing) {
        existing.clicks++;
      } else {
        acc.push({ url, clicks: 1 });
      }
      return acc;
    }, [] as { url: string; clicks: number }[])
    .sort((a, b) => b.clicks - a.clicks) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => adminNavigate('/admin/campaigns')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <Badge className={statusConfig[campaign.status]?.color}>
                  {statusConfig[campaign.status]?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">{campaign.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {campaign.status === 'draft' && (
              <Button onClick={() => adminNavigate(`/admin/campaigns/${id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {(campaign.status === 'sending' || campaign.status === 'paused') && (
              <>
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
                  <p className="text-xs text-muted-foreground">Clicks ({campaign.click_count})</p>
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
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="links">Link Performance</TabsTrigger>
            <TabsTrigger value="content">Email Content</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Engagement Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {hourlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={hourlyData}>
                        <XAxis dataKey="hour" />
                        <YAxis />
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
      </div>
    </div>
  );
}
