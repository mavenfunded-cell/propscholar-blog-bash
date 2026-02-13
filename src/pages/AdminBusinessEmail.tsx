import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, RefreshCw, Mail, Inbox, Send, Star, Archive,
  Search, Reply, Loader2, Sparkles, Check, Eye, ChevronLeft,
  MailOpen, Clock, Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';

interface BusinessEmail {
  id: string;
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string | null;
  direction: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  status: string;
  is_starred: boolean;
  received_at: string;
  created_at: string;
}

type FilterType = 'all' | 'unread' | 'starred' | 'sent' | 'archived';

export default function AdminBusinessEmail() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [emails, setEmails] = useState<BusinessEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<BusinessEmail | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply state
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [fixingGrammar, setFixingGrammar] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate(isAdminSubdomain() ? '/' : '/admin'); return; }
    fetchEmails();
  }, [authLoading, isAdmin]);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('business_emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setEmails((data || []) as BusinessEmail[]);
    } catch (e: any) {
      console.error('Error fetching business emails:', e);
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const pollInbox = async () => {
    setPolling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/poll-business-inbox`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` } }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      toast.success(`Fetched ${result.processed || 0} new emails`);
      await fetchEmails();
    } catch (e: any) {
      toast.error(e.message || 'Failed to poll inbox');
    } finally {
      setPolling(false);
    }
  };

  const selectEmail = async (email: BusinessEmail) => {
    setSelectedEmail(email);
    setShowReply(false);
    setReplyText('');
    if (email.status === 'unread' && email.direction === 'inbound') {
      await supabase.from('business_emails').update({ status: 'read' }).eq('id', email.id);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: 'read' } : e));
    }
  };

  const toggleStar = async (e: React.MouseEvent, email: BusinessEmail) => {
    e.stopPropagation();
    const newVal = !email.is_starred;
    await supabase.from('business_emails').update({ is_starred: newVal }).eq('id', email.id);
    setEmails(prev => prev.map(em => em.id === email.id ? { ...em, is_starred: newVal } : em));
    if (selectedEmail?.id === email.id) setSelectedEmail({ ...selectedEmail, is_starred: newVal });
  };

  const archiveEmail = async () => {
    if (!selectedEmail) return;
    await supabase.from('business_emails').update({ status: 'archived' }).eq('id', selectedEmail.id);
    setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, status: 'archived' } : e));
    setSelectedEmail(null);
    toast.success('Email archived');
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-business-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            to: selectedEmail.from_email,
            subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
            body: replyText,
            inReplyTo: selectedEmail.message_id,
            emailId: selectedEmail.id,
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      toast.success('Reply sent!');
      setReplyText('');
      setShowReply(false);
      await fetchEmails();
      setSelectedEmail(prev => prev ? { ...prev, status: 'replied' } : null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const fixGrammar = async () => {
    if (!replyText.trim()) return;
    setFixingGrammar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-grammar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ text: replyText }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      if (result.fixed && result.fixed !== replyText) {
        setReplyText(result.fixed);
        toast.success('Grammar fixed!');
      } else {
        toast.info('No grammar issues found');
      }
    } catch (e: any) {
      toast.error(e.message || 'Grammar fix failed');
    } finally {
      setFixingGrammar(false);
    }
  };

  const filteredEmails = emails.filter(e => {
    if (filter === 'unread') return e.status === 'unread';
    if (filter === 'starred') return e.is_starred;
    if (filter === 'sent') return e.direction === 'outbound';
    if (filter === 'archived') return e.status === 'archived';
    if (filter === 'all') return e.status !== 'archived';
    return true;
  }).filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.subject.toLowerCase().includes(q) || e.from_email.toLowerCase().includes(q) || e.from_name?.toLowerCase().includes(q) || e.body_text?.toLowerCase().includes(q);
  });

  const unreadCount = emails.filter(e => e.status === 'unread').length;
  const starredCount = emails.filter(e => e.is_starred).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(isAdminSubdomain() ? '/dashboard' : '/admin/dashboard')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              Business Email
            </h1>
            <p className="text-muted-foreground mt-1">business@propscholar.com</p>
          </div>
          <Button onClick={pollInbox} disabled={polling} className="bg-blue-600 hover:bg-blue-700">
            {polling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {polling ? 'Checking...' : 'Check Mail'}
          </Button>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-12 gap-0 border border-border rounded-xl overflow-hidden bg-card min-h-[calc(100vh-250px)]">
          {/* Sidebar Filters */}
          <div className="col-span-2 border-r border-border bg-card/80 p-3">
            <nav className="space-y-1">
              {[
                { key: 'all' as FilterType, label: 'Inbox', icon: Inbox, count: emails.filter(e => e.status !== 'archived').length },
                { key: 'unread' as FilterType, label: 'Unread', icon: MailOpen, count: unreadCount },
                { key: 'starred' as FilterType, label: 'Starred', icon: Star, count: starredCount },
                { key: 'sent' as FilterType, label: 'Sent', icon: Send, count: emails.filter(e => e.direction === 'outbound').length },
                { key: 'archived' as FilterType, label: 'Archived', icon: Archive, count: emails.filter(e => e.status === 'archived').length },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => { setFilter(item.key); setSelectedEmail(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    filter === item.key
                      ? 'bg-blue-500/15 text-blue-400 font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filter === item.key ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'
                    }`}>{item.count}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Email List */}
          <div className={`${selectedEmail ? 'col-span-4' : 'col-span-10'} border-r border-border flex flex-col`}>
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border h-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Mail className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No emails found</p>
                </div>
              ) : (
                filteredEmails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-all hover:bg-accent/30 ${
                      selectedEmail?.id === email.id ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                    } ${email.status === 'unread' ? 'bg-blue-500/[0.03]' : ''}`}
                  >
                    <button onClick={e => toggleStar(e, email)} className="mt-1 shrink-0">
                      <Star className={`w-4 h-4 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400/60'}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm truncate ${email.status === 'unread' ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {email.direction === 'outbound' ? `To: ${email.to_email}` : (email.from_name || email.from_email)}
                        </span>
                        {email.direction === 'outbound' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20">Sent</Badge>}
                        {email.status === 'replied' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-400 border-green-500/20">Replied</Badge>}
                      </div>
                      <p className={`text-sm truncate ${email.status === 'unread' ? 'font-medium text-foreground/90' : 'text-muted-foreground'}`}>{email.subject}</p>
                      <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{email.body_text?.substring(0, 80)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] text-muted-foreground/50">{formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}</span>
                      {email.status === 'unread' && <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-1" />}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Email Detail */}
          {selectedEmail && (
            <div className="col-span-6 flex flex-col">
              {/* Detail Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setSelectedEmail(null)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold text-foreground truncate">{selectedEmail.subject}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => toggleStar(e, selectedEmail)}>
                    <Star className={`w-4 h-4 ${selectedEmail.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={archiveEmail}>
                    <Archive className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  {selectedEmail.direction === 'inbound' && (
                    <Button size="sm" onClick={() => setShowReply(!showReply)} className="ml-2 bg-blue-600 hover:bg-blue-700 h-8">
                      <Reply className="w-3.5 h-3.5 mr-1.5" />Reply
                    </Button>
                  )}
                </div>
              </div>

              {/* Email Meta */}
              <div className="px-6 py-4 border-b border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-blue-400">
                      {(selectedEmail.from_name || selectedEmail.from_email)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{selectedEmail.from_name || selectedEmail.from_email}</p>
                    <p className="text-xs text-muted-foreground">{selectedEmail.from_email}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(new Date(selectedEmail.received_at), 'MMMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <ScrollArea className="flex-1 px-6 py-4">
                {selectedEmail.body_html ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedEmail.body_text || 'No content'}
                  </div>
                )}
              </ScrollArea>

              {/* Reply Composer */}
              {showReply && (
                <div className="border-t border-border p-4 bg-card/50">
                  <div className="border border-border rounded-xl overflow-hidden bg-background/50">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-accent/20">
                      <span className="text-xs text-muted-foreground font-medium">Replying to {selectedEmail.from_email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fixGrammar}
                        disabled={fixingGrammar || !replyText.trim()}
                        className="h-7 text-xs gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        {fixingGrammar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Fix Grammar
                      </Button>
                    </div>
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write your reply..."
                      className="border-0 rounded-none bg-transparent min-h-[120px] resize-none focus-visible:ring-0 text-sm"
                    />
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => { setShowReply(false); setReplyText(''); }} className="text-xs text-muted-foreground">
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={sendReply}
                        disabled={sending || !replyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 h-8 gap-1.5"
                      >
                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
