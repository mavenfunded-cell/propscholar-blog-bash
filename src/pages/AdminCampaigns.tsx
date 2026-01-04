import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, Users, Send, BarChart3, Plus, Eye, Copy, 
  Calendar, CheckCircle, Clock, Pause, XCircle,
  TrendingUp, MousePointer, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400', icon: Calendar },
  sending: { label: 'Sending', color: 'bg-amber-500/20 text-amber-400', icon: Send },
  sent: { label: 'Sent', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-400', icon: Pause },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

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
      navigate(`/admin/campaigns/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Manage marketing campaigns and audience
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/campaigns/audience')}>
              <Users className="w-4 h-4 mr-2" />
              Audience ({audienceCount})
            </Button>
            <Button onClick={() => navigate('/admin/campaigns/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.draft}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.scheduled}</p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openRate}%</p>
                  <p className="text-xs text-muted-foreground">Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <MousePointer className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clickRate}%</p>
                  <p className="text-xs text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bounceRate}%</p>
                  <p className="text-xs text-muted-foreground">Bounce Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({stats.draft})</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled ({stats.scheduled})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({stats.sent})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredCampaigns?.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first email campaign to get started
                </p>
                <Button onClick={() => navigate('/admin/campaigns/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
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
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {campaign.status === 'sent' && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{campaign.sent_count} sent</span>
                            <span>{campaignOpenRate}% opens</span>
                            <span>{campaignClickRate}% clicks</span>
                          </div>
                        )}

                        <Badge className={statusConfig[campaign.status]?.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[campaign.status]?.label}
                        </Badge>

                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/campaigns/${campaign.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
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
      </div>
    </div>
  );
}
