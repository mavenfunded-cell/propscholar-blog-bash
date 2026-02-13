import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, RefreshCw, Mail, Send, Loader2, Sparkles,
  ChevronRight, MailOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export default function AdminBusinessEmail() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [emails, setEmails] = useState<BusinessEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<BusinessEmail | null>(null);
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
    setReplyText('');
    if (email.status === 'unread' && email.direction === 'inbound') {
      await supabase.from('business_emails').update({ status: 'read' }).eq('id', email.id);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: 'read' } : e));
    }
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

  // Thread view: get all emails in the same thread or same subject chain
  const getThreadEmails = () => {
    if (!selectedEmail) return [];
    const threadId = selectedEmail.thread_id;
    const subject = selectedEmail.subject.replace(/^Re:\s*/gi, '');
    return emails
      .filter(e => {
        if (threadId && e.thread_id === threadId) return true;
        const s = e.subject.replace(/^Re:\s*/gi, '');
        return s === subject && (e.from_email === selectedEmail.from_email || e.to_email === selectedEmail.from_email || e.from_email === selectedEmail.to_email);
      })
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  // Chat detail view
  if (selectedEmail) {
    const thread = getThreadEmails();
    return (
      <div className="h-screen bg-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
          <button
            onClick={() => setSelectedEmail(null)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {selectedEmail.from_name || selectedEmail.from_email}
            </p>
            <p className="text-[11px] text-white/30 truncate">{selectedEmail.subject}</p>
          </div>
        </div>

        {/* Chat messages */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {thread.map(email => {
              const isOutbound = email.direction === 'outbound';
              return (
                <div key={email.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] group ${isOutbound ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isOutbound
                          ? 'bg-white text-black rounded-br-md'
                          : 'bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-bl-md'
                      }`}
                    >
                      {!isOutbound && (
                        <p className={`text-xs font-semibold mb-1.5 ${isOutbound ? 'text-black/60' : 'text-white/60'}`}>
                          {email.from_name || email.from_email}
                        </p>
                      )}
                      <p className="font-medium text-[13px] mb-1 opacity-80">{email.subject}</p>
                      <div className="whitespace-pre-wrap text-[13px] leading-[1.6] opacity-90">
                        {email.body_text?.substring(0, 600) || 'No content'}
                      </div>
                    </div>
                    <p className={`text-[10px] mt-1 px-1 ${isOutbound ? 'text-right text-white/20' : 'text-white/20'}`}>
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Reply bar */}
        {selectedEmail.direction === 'inbound' && (
          <div className="border-t border-white/[0.06] bg-black/80 backdrop-blur-xl px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-end gap-2">
              <button
                onClick={fixGrammar}
                disabled={fixingGrammar || !replyText.trim()}
                className="shrink-0 p-2.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all disabled:opacity-30"
                title="Fix Grammar"
              >
                {fixingGrammar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
              <div className="flex-1 relative">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type your reply..."
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="shrink-0 p-2.5 rounded-full bg-white text-black hover:bg-white/90 transition-all disabled:opacity-30 disabled:hover:bg-white"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Email list view
  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isAdminSubdomain() ? '/dashboard' : '/admin/dashboard')}
            className="text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <MailOpen className="w-5 h-5 text-white/50" />
            <span className="text-sm text-white/60">business@propscholar.com</span>
          </div>
        </div>
        <button
          onClick={pollInbox}
          disabled={polling}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
          {polling ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Email list */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto py-2">
          {emails.filter(e => e.status !== 'archived').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-white/20">
              <Mail className="w-10 h-10 mb-3" />
              <p className="text-sm">No emails</p>
            </div>
          ) : (
            emails.filter(e => e.status !== 'archived').map(email => {
              const isOutbound = email.direction === 'outbound';
              return (
                <button
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${email.status === 'unread' ? 'font-semibold text-white' : 'text-white/70'}`}>
                        {isOutbound ? `To: ${email.to_email}` : (email.from_name || email.from_email)}
                      </span>
                      {isOutbound && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">Sent</span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${email.status === 'unread' ? 'text-white/80' : 'text-white/40'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-white/20 truncate mt-0.5">{email.body_text?.substring(0, 80)}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-white/20">
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </span>
                    {email.status === 'unread' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
