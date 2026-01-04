import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  ArrowLeft, Save, Send, Eye, Smartphone, Monitor, Calendar,
  Clock, Users, AlertTriangle, CheckCircle, Loader2, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [campaign, setCampaign] = useState<Partial<Campaign>>({
    name: '',
    subject: '',
    preheader: '',
    sender_email: 'info@propscholar.com',
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
    enabled: !isNew,
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
  });

  const { data: audienceCount } = useQuery({
    queryKey: ['audience-count-for-campaign', campaign.target_tags, campaign.exclude_tags],
    queryFn: async () => {
      let query = supabase
        .from('audience_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_marketing_allowed', true)
        .is('unsubscribed_at', null);

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
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
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from('campaigns')
          .update(campaign)
          .eq('id', id);
        if (error) throw error;
        return { id };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign saved');
      if (isNew && data?.id) {
        navigate(`/admin/campaigns/${data.id}`, { replace: true });
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

      // Queue recipients
      const { data: audienceUsers, error: audienceError } = await supabase
        .from('audience_users')
        .select('id, email, first_name')
        .eq('is_marketing_allowed', true)
        .is('unsubscribed_at', null);

      if (audienceError) throw audienceError;
      if (!audienceUsers?.length) throw new Error('No eligible recipients');

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
      navigate('/admin/campaigns');
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
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {isNew ? 'New Campaign' : campaign.name || 'Edit Campaign'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{audienceCount} recipients</span>
                {campaign.status === 'draft' && (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>

            {!isNew && campaign.status === 'draft' && (
              <>
                <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                        />
                      </div>
                      <Button 
                        className="w-full" 
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
                    <Button>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!campaign.test_sent_at && (
                        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-sm">You must send a test email first</span>
                        </div>
                      )}

                      {campaign.test_sent_at && (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-500" />
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
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <Input 
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm">
                          Will be sent to <strong>{audienceCount}</strong> recipients
                        </span>
                      </div>

                      <Button 
                        className="w-full" 
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Name (internal)</Label>
                  <Input 
                    placeholder="Q1 Newsletter"
                    value={campaign.name}
                    onChange={(e) => setCampaign(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Subject Line</Label>
                  <Input 
                    placeholder="Your subject here..."
                    value={campaign.subject}
                    onChange={(e) => setCampaign(p => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Preheader</Label>
                  <Input 
                    placeholder="Preview text shown in inbox..."
                    value={campaign.preheader || ''}
                    onChange={(e) => setCampaign(p => ({ ...p, preheader: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sender Name</Label>
                    <Input 
                      value={campaign.sender_name}
                      onChange={(e) => setCampaign(p => ({ ...p, sender_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Sender Email</Label>
                    <Input 
                      value={campaign.sender_email}
                      onChange={(e) => setCampaign(p => ({ ...p, sender_email: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    className="min-h-[100px]"
                    placeholder="Plain text version..."
                    value={campaign.plain_text_content || ''}
                    onChange={(e) => setCampaign(p => ({ ...p, plain_text_content: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={previewMode === 'desktop' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={previewMode === 'mobile' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border rounded-lg overflow-hidden bg-white mx-auto transition-all ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
                  }`}
                >
                  <div className="p-3 border-b bg-muted/50">
                    <p className="text-xs text-muted-foreground">From: {campaign.sender_name} &lt;{campaign.sender_email}&gt;</p>
                    <p className="font-medium text-sm">{campaign.subject || 'No subject'}</p>
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
  );
}
