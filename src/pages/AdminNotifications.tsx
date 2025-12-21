import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Bell,
  MessageSquare,
  Clock,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminNotificationLog {
  id: string;
  admin_id: string;
  target_type: string;
  title: string;
  message: string;
  action_url: string | null;
  cta_text: string | null;
  sent_at: string;
  recipient_count: number;
}

interface UserOption {
  user_id: string;
  email: string;
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [logs, setLogs] = useState<AdminNotificationLog[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
    fetchData();
  }, [isLoggedIn, navigate]);

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('user_coins')
        .select('user_id, email')
        .order('email');

      if (usersData) {
        setUsers(usersData);
      }

      // Fetch notification logs
      const { data: logsData } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (logsData) {
        setLogs(logsData as AdminNotificationLog[]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    if (targetType === 'specific' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.rpc('send_admin_notification', {
        _title: title.trim(),
        _message: message.trim(),
        _action_url: actionUrl.trim() || null,
        _cta_text: ctaText.trim() || null,
        _target_type: targetType,
        _target_users: targetType === 'specific' ? selectedUsers : null
      });

      if (error) throw error;

      const result = data as { success: boolean; sent_count?: number; error?: string };

      if (result.success) {
        toast.success(`Notification sent to ${result.sent_count} user(s)`);
        setTitle('');
        setMessage('');
        setActionUrl('');
        setCtaText('');
        setSelectedUsers([]);
        fetchData();
      } else {
        throw new Error(result.error || 'Failed to send');
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-400" />
            Send Notifications
          </h1>
          <p className="text-muted-foreground mt-2">
            Send announcements and important messages to users
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Send Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Compose Notification
              </CardTitle>
              <CardDescription>
                Create and send a notification to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as 'all' | 'specific')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        All Users
                      </div>
                    </SelectItem>
                    <SelectItem value="specific">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Specific Users
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === 'specific' && (
                <div className="space-y-2">
                  <Label>Select Users</Label>
                  <Select 
                    value={selectedUsers[selectedUsers.length - 1] || ''} 
                    onValueChange={(v) => {
                      if (!selectedUsers.includes(v)) {
                        setSelectedUsers([...selectedUsers, v]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUsers.map((userId) => {
                        const userEmail = users.find(u => u.user_id === userId)?.email;
                        return (
                          <Badge 
                            key={userId} 
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
                          >
                            {userEmail} ✕
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Important announcement..."
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message to users..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionUrl">Action URL (optional)</Label>
                <Input
                  id="actionUrl"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/rewards or /dashboard"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Button Text (optional)</Label>
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Learn More"
                />
              </div>

              <Button 
                onClick={handleSend} 
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Notifications
              </CardTitle>
              <CardDescription>
                History of sent notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{log.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {log.message}
                          </p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          <Users className="w-3 h-3 mr-1" />
                          {log.recipient_count}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {log.target_type === 'all' ? 'All Users' : 'Selected Users'}
                        </span>
                        <span>
                          {format(new Date(log.sent_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
