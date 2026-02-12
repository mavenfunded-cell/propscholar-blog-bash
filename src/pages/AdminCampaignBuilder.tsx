import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  ArrowLeft, Save, Eye, Smartphone, Monitor, Calendar,
  Users, AlertTriangle, CheckCircle, Loader2, Mail, Copy,
  History, LayoutTemplate, Wand2, TestTube, Clock, ChevronDown,
  Sparkles, PanelRightClose, PanelRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TemplateLibrary } from '@/components/admin/TemplateLibrary';
import { VisualEmailEditor } from '@/components/admin/VisualEmailEditor';
import { ABTestingPanel } from '@/components/admin/ABTestingPanel';
import { AdvancedScheduling } from '@/components/admin/AdvancedScheduling';
import { EmailAIEnhancer } from '@/components/admin/EmailAIEnhancer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  sender_email: string;
  sender_name: string;
  html_content: string;
  plain_text_content: string | null;
  status: string;
  scheduled_at: string | null;
  target_tags: string[];
  exclude_tags: string[];
  total_recipients: number;
  test_sent_at: string | null;
  test_sent_to: string | null;
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #1a1a2e; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    a { color: #6366f1; }
    .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PropScholar</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Your content goes here...</p>
      <p><a href="#" class="btn">Call to Action</a></p>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to PropScholar updates.</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;

export default function AdminCampaignBuilder() {
  const { id } = useParams();
  const { adminNavigate, getLoginPath, getDashboardPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading, email } = useAdminAuth();
  const queryClient = useQueryClient();
  const isNew = id === 'new' || !id;

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [campaign, setCampaign] = useState<Partial<Campaign>>({
    name: '',
    subject: '',
    preheader: '',
    sender_email: 'marketing@propscholar.com',
    sender_name: 'PropScholar',
    html_content: DEFAULT_HTML,
    plain_text_content: '',
    target_tags: [],
    exclude_tags: [],
  });
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isSaving, setIsSaving] = useState(false);
  const [previousCampaignsOpen, setPreviousCampaignsOpen] = useState(false);
  const [advancedFeaturesTab, setAdvancedFeaturesTab] = useState<string>('editor');
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);
  
  // A/B Testing state
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [abVariants, setAbVariants] = useState([
    { id: '1', name: 'Variant A', subject: '', percentage: 50 },
    { id: '2', name: 'Variant B', subject: '', percentage: 50 },
  ]);
  
  // Advanced Scheduling state
  const [advScheduleDate, setAdvScheduleDate] = useState('');
  const [advScheduleTime, setAdvScheduleTime] = useState('09:00');
  const [advTimezone, setAdvTimezone] = useState('UTC');
  const [sendOptimalTime, setSendOptimalTime] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('weekly');
  
  // AI Enhancer state
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);

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


  const { data: existingCampaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    enabled: hasAccess === true && !isNew,
  });

  const { data: tags } = useQuery({
    queryKey: ['audience-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: hasAccess === true,
  });

  const { data: audienceCount } = useQuery({
    queryKey: ['audience-count-for-campaign', campaign.target_tags, campaign.exclude_tags],
    queryFn: async () => {
      let query = supabase
        .from('audience_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_marketing_allowed', true)
        .is('unsubscribed_at', null);

      // Filter by target tags if specified
      if (campaign.target_tags && campaign.target_tags.length > 0) {
        query = query.overlaps('tags', campaign.target_tags);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: hasAccess === true,
  });

  // Fetch previous campaigns for copy feature
  const { data: previousCampaigns } = useQuery({
    queryKey: ['previous-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, subject, html_content, created_at, status, sent_count, open_count')
        .neq('id', id || '')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: hasAccess === true,
  });

  useEffect(() => {
    if (existingCampaign) {
      setCampaign(existingCampaign);
    }
  }, [existingCampaign]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      if (isNew) {
        const { data, error } = await supabase
          .from('campaigns')
          .insert([{
            name: campaign.name || 'Untitled Campaign',
            subject: campaign.subject || 'No subject',
            html_content: campaign.html_content || DEFAULT_HTML,
            preheader: campaign.preheader,
            sender_email: campaign.sender_email,
            sender_name: campaign.sender_name,
            plain_text_content: campaign.plain_text_content,
            target_tags: campaign.target_tags || [],
            exclude_tags: campaign.exclude_tags || [],
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from('campaigns')
          .update({
            ...campaign,
            target_tags: campaign.target_tags || [],
            exclude_tags: campaign.exclude_tags || [],
          })
          .eq('id', id);
        if (error) throw error;
        return { id };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign saved');
      if (isNew && data?.id) {
        adminNavigate(`/admin/campaigns/${data.id}`);
      }
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save');
      setIsSaving(false);
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('send-campaign-test', {
        body: {
          campaignId: id,
          testEmail,
          subject: campaign.subject,
          htmlContent: campaign.html_content,
          senderEmail: campaign.sender_email,
          senderName: campaign.sender_name,
          preheader: campaign.preheader,
        },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await supabase
        .from('campaigns')
        .update({ test_sent_at: new Date().toISOString(), test_sent_to: testEmail })
        .eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      setTestEmailDialogOpen(false);
      toast.success(`Test email sent to ${testEmail}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send test email');
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!campaign.test_sent_at) {
        throw new Error('You must send a test email before scheduling');
      }
      
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      if (scheduledAt <= new Date()) {
        throw new Error('Schedule time must be in the future');
      }

      // Queue recipients - filter by target tags if specified
      let audienceQuery = supabase
        .from('audience_users')
        .select('id, email, first_name')
        .eq('is_marketing_allowed', true)
        .is('unsubscribed_at', null);

      // Filter by target tags if specified
      if (campaign.target_tags && campaign.target_tags.length > 0) {
        audienceQuery = audienceQuery.overlaps('tags', campaign.target_tags);
      }

      const { data: audienceUsers, error: audienceError } = await audienceQuery;

      if (audienceError) throw audienceError;
      if (!audienceUsers?.length) throw new Error('No eligible recipients in the selected group');

      // Insert recipients
      const recipients = audienceUsers.map(user => ({
        campaign_id: id,
        audience_user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        status: 'pending',
      }));

      const { error: recipientError } = await supabase
        .from('campaign_recipients')
        .insert(recipients);

      if (recipientError) throw recipientError;

      // Update campaign status
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
          total_recipients: audienceUsers.length,
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setScheduleDialogOpen(false);
      toast.success('Campaign scheduled!');
      adminNavigate('/admin/campaigns');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to schedule');
    },
  });

  const renderPreview = () => {
    let html = campaign.html_content || '';
    html = html.replace(/\{\{first_name\}\}/g, 'John');
    html = html.replace(/\{\{email\}\}/g, 'john@example.com');
    html = html.replace(/\{\{subject\}\}/g, campaign.subject || '');
    html = html.replace(/\{\{unsubscribe_url\}\}/g, '#');
    return html;
  };

  const copyFromCampaign = (campaignToCopy: any) => {
    setCampaign(prev => ({
      ...prev,
      html_content: campaignToCopy.html_content,
    }));
    setPreviousCampaignsOpen(false);
    toast.success(`Copied content from "${campaignToCopy.name}"`);
  };

  const handleTemplateSelect = (template: any) => {
    setCampaign(prev => ({
      ...prev,
      html_content: template.html_content,
      subject: template.subject || prev.subject,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <h1 className="text-xl font-semibold tracking-tight">
                {isNew ? 'New Campaign' : campaign.name || 'Edit Campaign'}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{audienceCount} recipients</span>
                </div>
                {campaign.status === 'draft' && (
                  <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                    Draft
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showAIEnhancer ? 'default' : 'outline'}
              onClick={() => setShowAIEnhancer(!showAIEnhancer)}
              className="rounded-lg border-border/50"
            >
              {showAIEnhancer ? <PanelRightClose className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI Assist
            </Button>
            <Button 
              variant="outline" 
              onClick={() => saveMutation.mutate()} 
              disabled={isSaving}
              className="rounded-lg border-border/50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>

            {!isNew && campaign.status === 'draft' && (
              <>
                <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-lg border-border/50">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-border/50">
                    <DialogHeader>
                      <DialogTitle>Send Test Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Email Address</Label>
                        <Input 
                          type="email"
                          placeholder="test@example.com"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <Button 
                        className="w-full rounded-lg" 
                        onClick={() => sendTestMutation.mutate()}
                        disabled={sendTestMutation.isPending}
                      >
                        {sendTestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Send Test Email
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-lg bg-foreground text-background hover:bg-foreground/90">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-border/50">
                    <DialogHeader>
                      <DialogTitle>Schedule Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!campaign.test_sent_at && (
                        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          <span className="text-sm">You must send a test email first</span>
                        </div>
                      )}

                      {campaign.test_sent_at && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          <span className="text-sm">
                            Test sent to {campaign.test_sent_to} on{' '}
                            {format(new Date(campaign.test_sent_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      )}

                      <div>
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <Input 
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="text-sm">
                          Will be sent to <strong>{audienceCount}</strong> recipients
                        </span>
                      </div>

                      <Button 
                        className="w-full rounded-lg" 
                        onClick={() => scheduleMutation.mutate()}
                        disabled={!campaign.test_sent_at || scheduleMutation.isPending}
                      >
                        {scheduleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Schedule Campaign
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex">
        <div className={`flex-1 transition-all ${showAIEnhancer ? 'mr-80' : ''}`}>
          <div className="max-w-7xl mx-auto p-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Editor */}
              <div className="space-y-6">
            {/* Previous Campaigns - Collapsible */}
            <Collapsible open={previousCampaignsOpen} onOpenChange={setPreviousCampaignsOpen}>
              <Card className="border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <History className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Copy from Previous Campaign</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {previousCampaigns?.length || 0} campaigns available
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${previousCampaignsOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ScrollArea className="h-[250px]">
                      {previousCampaigns?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No previous campaigns found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {previousCampaigns?.map((prev) => (
                            <div
                              key={prev.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all group"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{prev.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{prev.subject}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {prev.status}
                                  </Badge>
                                  {prev.sent_count && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {prev.sent_count} sent • {((prev.open_count || 0) / prev.sent_count * 100).toFixed(0)}% opened
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(prev.created_at), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => copyFromCampaign(prev)}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                Copy
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Name (internal)</Label>
                  <Input 
                    placeholder="Q1 Newsletter"
                    value={campaign.name}
                    onChange={(e) => setCampaign(p => ({ ...p, name: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Subject Line</Label>
                  <Input 
                    placeholder="Your subject here..."
                    value={campaign.subject}
                    onChange={(e) => setCampaign(p => ({ ...p, subject: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Preheader</Label>
                  <Input 
                    placeholder="Preview text shown in inbox..."
                    value={campaign.preheader || ''}
                    onChange={(e) => setCampaign(p => ({ ...p, preheader: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sender Name</Label>
                    <Input 
                      value={campaign.sender_name}
                      onChange={(e) => setCampaign(p => ({ ...p, sender_name: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Sender Email</Label>
                    <Input 
                      value={campaign.sender_email}
                      onChange={(e) => setCampaign(p => ({ ...p, sender_email: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Separator className="my-4" />
                
                {/* Target Audience Group Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Target Audience Group
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select a specific group to send to, or leave empty to send to all subscribers
                  </p>
                  <Select
                    value={campaign.target_tags?.[0] || 'all'}
                    onValueChange={(value) => setCampaign(p => ({ 
                      ...p, 
                      target_tags: value === 'all' ? [] : [value] 
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All subscribers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>All Subscribers</span>
                        </div>
                      </SelectItem>
                      {tags?.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.color || '#6366f1' }}
                            />
                            <span>{tag.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {campaign.target_tags && campaign.target_tags.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="rounded-full"
                        style={{ 
                          borderColor: tags?.find(t => t.id === campaign.target_tags?.[0])?.color || '#6366f1',
                          color: tags?.find(t => t.id === campaign.target_tags?.[0])?.color || '#6366f1'
                        }}
                      >
                        {tags?.find(t => t.id === campaign.target_tags?.[0])?.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">selected</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Content with Advanced Features */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Email Content</CardTitle>
                  <div className="flex items-center gap-2">
                    <TemplateLibrary 
                      onSelect={handleTemplateSelect}
                      currentHtml={campaign.html_content}
                    />
                    <Button
                      variant={showAdvancedFeatures ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowAdvancedFeatures(!showAdvancedFeatures)}
                    >
                      <Wand2 className="w-4 h-4 mr-1.5" />
                      Advanced
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showAdvancedFeatures && (
                  <div className="border border-border/50 rounded-lg p-4 bg-muted/20">
                    <Tabs value={advancedFeaturesTab} onValueChange={setAdvancedFeaturesTab}>
                      <TabsList className="mb-4 w-full grid grid-cols-3">
                        <TabsTrigger value="editor" className="text-xs gap-1.5">
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          Visual Editor
                        </TabsTrigger>
                        <TabsTrigger value="abtest" className="text-xs gap-1.5">
                          <TestTube className="w-3.5 h-3.5" />
                          A/B Testing
                        </TabsTrigger>
                        <TabsTrigger value="schedule" className="text-xs gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Scheduling
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="editor" className="mt-0">
                        <VisualEmailEditor
                          value={campaign.html_content || ''}
                          onChange={(val) => setCampaign(p => ({ ...p, html_content: val }))}
                        />
                      </TabsContent>

                      <TabsContent value="abtest" className="mt-0">
                        <ABTestingPanel
                          enabled={abTestEnabled}
                          onEnabledChange={setAbTestEnabled}
                          variants={abVariants}
                          onVariantsChange={setAbVariants}
                        />
                      </TabsContent>

                      <TabsContent value="schedule" className="mt-0">
                        <AdvancedScheduling
                          scheduleDate={advScheduleDate}
                          scheduleTime={advScheduleTime}
                          timezone={advTimezone}
                          sendOptimalTime={sendOptimalTime}
                          recurringEnabled={recurringEnabled}
                          recurringFrequency={recurringFrequency}
                          onScheduleDateChange={setAdvScheduleDate}
                          onScheduleTimeChange={setAdvScheduleTime}
                          onTimezoneChange={setAdvTimezone}
                          onSendOptimalTimeChange={setSendOptimalTime}
                          onRecurringEnabledChange={setRecurringEnabled}
                          onRecurringFrequencyChange={setRecurringFrequency}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {!showAdvancedFeatures && (
                  <>
                    <div>
                      <Label>HTML Content</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Variables: {'{{first_name}}'}, {'{{email}}'}, {'{{unsubscribe_url}}'}
                      </p>
                      <Textarea 
                        className="font-mono text-sm min-h-[300px]"
                        value={campaign.html_content}
                        onChange={(e) => setCampaign(p => ({ ...p, html_content: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Plain Text (fallback)</Label>
                      <Textarea 
                        className="min-h-[100px] mt-1.5"
                        placeholder="Plain text version..."
                        value={campaign.plain_text_content || ''}
                        onChange={(e) => setCampaign(p => ({ ...p, plain_text_content: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="sticky top-24 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={previewMode === 'desktop' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                      className="rounded-lg"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={previewMode === 'mobile' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                      className="rounded-lg"
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border border-border/50 rounded-lg overflow-hidden bg-white mx-auto transition-all ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
                  }`}
                >
                  <div className="p-3 border-b bg-muted/50">
                    <p className="text-xs text-muted-foreground">From: {campaign.sender_name} &lt;{campaign.sender_email}&gt;</p>
                    <p className="font-medium text-sm text-foreground">{campaign.subject || 'No subject'}</p>
                    {campaign.preheader && (
                      <p className="text-xs text-muted-foreground">{campaign.preheader}</p>
                    )}
                  </div>
                  <iframe
                    srcDoc={renderPreview()}
                    className="w-full min-h-[400px] border-0"
                    title="Email Preview"
                  />
                </div>
              </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Enhancer Sidebar */}
        {showAIEnhancer && (
          <div className="fixed right-0 top-0 bottom-0 w-80 z-30 shadow-2xl">
            <EmailAIEnhancer
              htmlContent={campaign.html_content || ''}
              subject={campaign.subject || ''}
              onUpdateContent={(html) => setCampaign(p => ({ ...p, html_content: html }))}
              onUpdateSubject={(subj) => setCampaign(p => ({ ...p, subject: subj }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
