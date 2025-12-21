import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Download, Mail, CheckCircle, XCircle, Clock, RefreshCw, Users, Send, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  email_type: string;
  status: string;
  error_message: string | null;
  event_id: string | null;
  created_at: string;
  message_body: string | null;
}

interface UserEmail {
  email: string;
  created_at: string;
}

export default function AdminEmails() {
  const navigate = useNavigate();
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [userEmails, setUserEmails] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [activeTab, setActiveTab] = useState<'logs' | 'subscribers' | 'compose'>('logs');
  
  // Compose email state
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [specificEmails, setSpecificEmails] = useState('');
  const [sending, setSending] = useState(false);
  
  // View email state
  const [viewEmailOpen, setViewEmailOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/admin');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchEmailLogs();
      fetchUserEmails();
    }
  }, [isLoggedIn]);

  const fetchEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      const logs = (data || []) as EmailLog[];
      setEmailLogs(logs);
      
      // Calculate stats
      const total = logs.length;
      const sent = logs.filter(l => l.status === 'sent').length;
      const failed = logs.filter(l => l.status === 'failed').length;
      setStats({ total, sent, failed });
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast.error('Failed to fetch email logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('email, created_at')
        .not('email', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserEmails((data || []) as UserEmail[]);
    } catch (error) {
      console.error('Error fetching user emails:', error);
    }
  };

  const exportEmails = () => {
    const csvContent = 'Email,Signed Up At\n' + 
      userEmails.map(u => `${u.email},${format(new Date(u.created_at), 'yyyy-MM-dd HH:mm:ss')}`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `propscholar_emails_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success(`Exported ${userEmails.length} emails`);
  };

  const sendAdminEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (targetType === 'specific' && !specificEmails.trim()) {
      toast.error('Please enter recipient email addresses');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const targetEmails = targetType === 'specific' 
        ? specificEmails.split(/[,\n]/).map(e => e.trim()).filter(Boolean)
        : undefined;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-admin-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject: emailSubject,
            message: emailMessage,
            targetType,
            targetEmails,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send emails');
      }

      toast.success(`Emails sent! ${result.sent} successful, ${result.failed} failed`);
      setComposeOpen(false);
      setEmailSubject('');
      setEmailMessage('');
      setSpecificEmails('');
      fetchEmailLogs();
    } catch (error: any) {
      console.error('Error sending admin email:', error);
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'bounced':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><XCircle className="w-3 h-3 mr-1" />Bounced</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      announcement: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      winner_notification: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      balance_change: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      magic_link: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      admin_broadcast: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      blog_vote: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      referral: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return <Badge className={colors[type] || 'bg-gray-500/20 text-gray-400'}>{type.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-bg flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-bg">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Mail className="w-8 h-8 text-primary" />
              Email Management
            </h1>
            <p className="text-white/60 mt-1">Track email delivery and manage subscribers</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Send className="w-4 h-4 mr-2" />
                  Compose Email
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Send Email to Users</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Recipients</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={targetType === 'all' ? 'default' : 'outline'}
                        onClick={() => setTargetType('all')}
                        size="sm"
                      >
                        All Users ({userEmails.length})
                      </Button>
                      <Button
                        type="button"
                        variant={targetType === 'specific' ? 'default' : 'outline'}
                        onClick={() => setTargetType('specific')}
                        size="sm"
                      >
                        Specific Emails
                      </Button>
                    </div>
                  </div>

                  {targetType === 'specific' && (
                    <div className="space-y-2">
                      <Label className="text-white/80">Email Addresses (comma or newline separated)</Label>
                      <Textarea
                        placeholder="user1@example.com, user2@example.com"
                        value={specificEmails}
                        onChange={(e) => setSpecificEmails(e.target.value)}
                        className="bg-background/50 border-white/10 text-white min-h-[80px]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-white/80">Subject</Label>
                    <Input
                      placeholder="Email subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-background/50 border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Message</Label>
                    <Textarea
                      placeholder="Write your message here..."
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="bg-background/50 border-white/10 text-white min-h-[200px]"
                    />
                  </div>

                  <Button
                    onClick={sendAdminEmail}
                    disabled={sending}
                    className="w-full"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant={activeTab === 'logs' ? 'default' : 'outline'}
              onClick={() => setActiveTab('logs')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Logs
            </Button>
            <Button 
              variant={activeTab === 'subscribers' ? 'default' : 'outline'}
              onClick={() => setActiveTab('subscribers')}
            >
              <Users className="w-4 h-4 mr-2" />
              Subscribers ({userEmails.length})
            </Button>
          </div>
        </div>

        {activeTab === 'logs' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-card/50 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Total Emails</p>
                      <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </div>
                    <Mail className="w-10 h-10 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Successfully Sent</p>
                      <p className="text-3xl font-bold text-green-400">{stats.sent}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Failed</p>
                      <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
                    </div>
                    <XCircle className="w-10 h-10 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email Logs Table */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Email Delivery Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchEmailLogs}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/70">Recipient</TableHead>
                        <TableHead className="text-white/70">Subject</TableHead>
                        <TableHead className="text-white/70">Type</TableHead>
                        <TableHead className="text-white/70">Status</TableHead>
                        <TableHead className="text-white/70">Date</TableHead>
                        <TableHead className="text-white/70">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-white/50 py-8">
                            No email logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        emailLogs.map((log) => (
                          <TableRow key={log.id} className="border-white/10">
                            <TableCell className="text-white/80 font-mono text-sm">
                              {log.recipient_email}
                            </TableCell>
                            <TableCell className="text-white/60 max-w-xs truncate">
                              {log.subject}
                            </TableCell>
                            <TableCell>{getTypeBadge(log.email_type)}</TableCell>
                            <TableCell>
                              {getStatusBadge(log.status)}
                              {log.error_message && (
                                <p className="text-xs text-red-400 mt-1 max-w-xs truncate">
                                  {log.error_message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-white/50 text-sm">
                              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmail(log);
                                  setViewEmailOpen(true);
                                }}
                                className="text-white/60 hover:text-white"
                                title="View email content"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'subscribers' && (
          <Card className="bg-card/50 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Registered Users ({userEmails.length})</CardTitle>
              <Button onClick={exportEmails} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Export All Emails
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/70">#</TableHead>
                      <TableHead className="text-white/70">Email</TableHead>
                      <TableHead className="text-white/70">Signed Up</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userEmails.map((user, index) => (
                      <TableRow key={user.email} className="border-white/10">
                        <TableCell className="text-white/50">{index + 1}</TableCell>
                        <TableCell className="text-white/80 font-mono">{user.email}</TableCell>
                        <TableCell className="text-white/50">
                          {format(new Date(user.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        {/* View Email Dialog */}
        <Dialog open={viewEmailOpen} onOpenChange={setViewEmailOpen}>
          <DialogContent className="sm:max-w-[600px] bg-card border-white/10 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Email Details</DialogTitle>
            </DialogHeader>
            {selectedEmail && (
              <div className="space-y-4 mt-4">
                <div className="space-y-1">
                  <Label className="text-white/60 text-sm">Recipient</Label>
                  <p className="text-white font-mono">{selectedEmail.recipient_email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/60 text-sm">Subject</Label>
                  <p className="text-white">{selectedEmail.subject}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/60 text-sm">Type</Label>
                  <div>{getTypeBadge(selectedEmail.email_type)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/60 text-sm">Status</Label>
                  <div>{getStatusBadge(selectedEmail.status)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/60 text-sm">Sent At</Label>
                  <p className="text-white/80">{format(new Date(selectedEmail.created_at), 'MMMM d, yyyy HH:mm:ss')}</p>
                </div>
                {selectedEmail.error_message && (
                  <div className="space-y-1">
                    <Label className="text-white/60 text-sm">Error Message</Label>
                    <p className="text-red-400">{selectedEmail.error_message}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-white/60 text-sm">Message Content</Label>
                  <div className="bg-background/50 border border-white/10 rounded-lg p-4 text-white/80 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {selectedEmail.message_body || <span className="text-white/40 italic">No message content stored</span>}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
