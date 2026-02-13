import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, RefreshCw, Mail, Send, Loader2, Sparkles, MailOpen, Plus, X
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
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

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

  const getContactEmail = (email: BusinessEmail) => {
    return email.direction === 'outbound' ? email.to_email : email.from_email;
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSending(true);
    const contactEmail = getContactEmail(selectedEmail);
    // Find the latest inbound message for threading
    const threadEmails = getThreadEmails();
    const latestInbound = [...threadEmails].reverse().find(e => e.direction === 'inbound');
    const latestMessage = threadEmails[threadEmails.length - 1];
    const replyToMsg = latestInbound || latestMessage || selectedEmail;
    const subject = selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-business-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            to: contactEmail,
            subject,
            body: replyText,
            inReplyTo: replyToMsg.message_id,
            emailId: replyToMsg.id,
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

  const fixGrammar = async (text: string, setText: (v: string) => void) => {
    if (!text.trim()) return;
    setFixingGrammar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-grammar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ text }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      if (result.fixed && result.fixed !== text) {
        setText(result.fixed);
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

  const sendCompose = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return;
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
            to: composeTo,
            subject: composeSubject || '(No Subject)',
            body: composeBody,
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      toast.success('Email sent!');
      setComposing(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      await fetchEmails();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // Group emails into conversations by sender
  const getConversations = () => {
    const convMap = new Map<string, BusinessEmail[]>();
    emails.forEach(email => {
      const key = email.direction === 'outbound' ? email.to_email : email.from_email;
      if (!convMap.has(key)) convMap.set(key, []);
      convMap.get(key)!.push(email);
    });
    // Sort conversations by latest email
    return Array.from(convMap.entries())
      .map(([contactEmail, msgs]) => {
        const sorted = msgs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
        const latest = sorted[0];
        const unreadCount = msgs.filter(m => m.status === 'unread' && m.direction === 'inbound').length;
        const contactName = msgs.find(m => m.direction === 'inbound' && m.from_name)?.from_name || contactEmail;
        return { contactEmail, contactName, latest, unreadCount, msgs: sorted };
      })
      .sort((a, b) => new Date(b.latest.received_at).getTime() - new Date(a.latest.received_at).getTime());
  };

  const getThreadEmails = () => {
    if (!selectedEmail) return [];
    const contactEmail = selectedEmail.direction === 'outbound' ? selectedEmail.to_email : selectedEmail.from_email;
    return emails
      .filter(e => e.from_email === contactEmail || e.to_email === contactEmail)
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  const conversations = getConversations();
  const selectedContact = selectedEmail
    ? (selectedEmail.direction === 'outbound' ? selectedEmail.to_email : selectedEmail.from_email)
    : null;

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl shrink-0">
        <button
          onClick={() => navigate(isAdminSubdomain() ? '/dashboard' : '/admin/dashboard')}
          className="text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <MailOpen className="w-5 h-5 text-white/50" />
        <span className="text-sm text-white/60">business@propscholar.com</span>
        <div className="flex-1" />
        <button
          onClick={pollInbox}
          disabled={polling}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
          {polling ? 'Checking...' : 'Refresh'}
        </button>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 text-xs bg-white text-black px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Compose
        </button>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Conversation list */}
        <div className="w-[380px] shrink-0 border-r border-white/[0.06] flex flex-col">
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-white/20">
                <Mail className="w-10 h-10 mb-3" />
                <p className="text-sm">No emails</p>
              </div>
            ) : (
              conversations.map(conv => {
                const isActive = selectedContact === conv.contactEmail;
                return (
                  <button
                    key={conv.contactEmail}
                    onClick={() => selectEmail(conv.latest)}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-white/[0.04] ${
                      isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Avatar circle */}
                    <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-white/50">
                        {conv.contactName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[13px] truncate ${conv.unreadCount > 0 ? 'font-semibold text-white' : 'text-white/70'}`}>
                          {conv.contactName}
                        </span>
                        <span className="text-[11px] text-white/25 shrink-0">
                          {formatDistanceToNow(new Date(conv.latest.received_at), { addSuffix: false })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? 'text-white/60' : 'text-white/30'}`}>
                          {conv.latest.direction === 'outbound' && <span className="text-white/20">You: </span>}
                          {conv.latest.body_text?.substring(0, 60) || conv.latest.subject}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Right: Chat view */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/15">
              <MailOpen className="w-16 h-16 mb-4" />
              <p className="text-lg font-light">Select a conversation</p>
              <p className="text-xs text-white/10 mt-1">Choose from your emails on the left</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-black/60 backdrop-blur-xl shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center">
                  <span className="text-sm font-medium text-white/50">
                    {(selectedEmail.from_name || selectedEmail.from_email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedEmail.direction === 'outbound' ? selectedEmail.to_email : (selectedEmail.from_name || selectedEmail.from_email)}
                  </p>
                  <p className="text-[11px] text-white/25 truncate">
                    {selectedEmail.direction === 'outbound' ? selectedEmail.to_email : selectedEmail.from_email}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-5 py-6">
                <div className="max-w-2xl mx-auto space-y-3">
                  {getThreadEmails().map(email => {
                    const isOutbound = email.direction === 'outbound';
                    return (
                      <div key={email.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[80%]">
                          <div
                            className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                              isOutbound
                                ? 'bg-white/[0.04] border border-white/[0.15] text-white/90 rounded-br-sm'
                                : 'bg-white/[0.03] border border-white/[0.08] text-white/80 rounded-bl-sm'
                            }`}
                          >
                            <p className="font-medium text-[11px] mb-1.5 opacity-50">{email.subject}</p>
                            <div className="whitespace-pre-wrap leading-[1.6] opacity-90">
                              {email.body_text?.substring(0, 800) || 'No content'}
                            </div>
                          </div>
                          <p className={`text-[10px] mt-1 px-1 ${isOutbound ? 'text-right' : ''} text-white/20`}>
                            {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Reply bar */}
              <div className="border-t border-white/[0.06] bg-black/80 backdrop-blur-xl px-4 py-3 shrink-0">
                <div className="max-w-2xl mx-auto flex items-end gap-2">
                  <button
                    onClick={() => fixGrammar(replyText, setReplyText)}
                    disabled={fixingGrammar || !replyText.trim()}
                    className="shrink-0 p-2.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all disabled:opacity-30"
                    title="Fix Grammar"
                  >
                    {fixingGrammar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                  <div className="flex-1">
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
                    className="shrink-0 p-2.5 rounded-full bg-white text-black hover:bg-white/90 transition-all disabled:opacity-30"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-2xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-white">New Email</h2>
              <button onClick={() => setComposing(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                placeholder="To (email address)"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
              />
              <input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                placeholder="Subject"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
              />
              <div className="relative">
                <textarea
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => fixGrammar(composeBody, setComposeBody)}
                disabled={fixingGrammar || !composeBody.trim()}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
              >
                {fixingGrammar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Fix Grammar
              </button>
              <button
                onClick={sendCompose}
                disabled={sending || !composeTo.trim() || !composeBody.trim()}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90 transition-all disabled:opacity-30"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
