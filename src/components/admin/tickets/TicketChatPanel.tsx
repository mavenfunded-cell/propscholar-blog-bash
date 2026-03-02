import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Send,
  User,
  Headphones,
  StickyNote,
  Bot,
  PanelRightOpen,
  PanelRightClose,
  Paperclip,
  X,
  ImageIcon,
  Download,
  FileText,
  MoreHorizontal,
  Wand2,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { useReplyAIEnhancer } from "@/components/admin/ReplyAIEnhancer";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_email: string;
  sender_name: string | null;
  sender_type: string;
  body: string;
  body_html: string | null;
  is_internal_note: boolean;
  created_at: string;
  attachments: any[];
}

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  user_email: string;
  status: TicketStatus;
  priority: string;
  source?: string;
  created_at: string;
  updated_at: string;
  last_reply_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  awaiting_support: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  awaiting_user: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  closed: "bg-muted/80 text-muted-foreground border-border/50",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  awaiting_support: "Awaiting Support",
  awaiting_user: "Awaiting User",
  closed: "Closed",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

interface TicketChatPanelProps {
  ticketId: string | null;
  onBack: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
  isMobile: boolean;
}

const decodeQuotedPrintable = (text: string): string => {
  if (!text) return text;
  let decoded = text.replace(/=\r?\n/g, '');
  try {
    const bytes: number[] = [];
    let i = 0;
    while (i < decoded.length) {
      if (decoded[i] === '=' && i + 2 < decoded.length) {
        const hex = decoded.substring(i + 1, i + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(parseInt(hex, 16));
          i += 3;
          continue;
        }
      }
      if (bytes.length > 0) {
        const decodedChunk = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
        decoded = decoded.substring(0, i - bytes.length * 3) + decodedChunk + decoded.substring(i);
        i = i - bytes.length * 3 + decodedChunk.length;
        bytes.length = 0;
      }
      i++;
    }
    if (bytes.length > 0) {
      const decodedChunk = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
      decoded = decoded.substring(0, decoded.length - bytes.length * 3) + decodedChunk;
    }
  } catch {
    decoded = text.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  return decoded;
};

const moderators = [
  { name: "Chirag C", isDefault: true },
  { name: "Ben K", isDefault: false },
  { name: "Harris", isDefault: false },
  { name: "Sikha", isDefault: false },
  { name: "Rose", isDefault: false },
];

const getSignature = (modName: string) => `\n\nBest Regards,\n${modName}\nPropScholar Support`;

export function TicketChatPanel({ ticketId, onBack, showDetails, onToggleDetails, isMobile }: TicketChatPanelProps) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [selectedMod, setSelectedMod] = useState("Chirag C");
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiEnhancer = useReplyAIEnhancer();

  // Listen for insert-reply events from details panel
  useEffect(() => {
    const handleInsertReply = (e: Event) => {
      const content = (e as CustomEvent).detail;
      if (content) setReplyBody(content);
    };
    window.addEventListener("insert-reply", handleInsertReply);
    return () => window.removeEventListener("insert-reply", handleInsertReply);
  }, []);

  const { data: ticket } = useQuery({
    queryKey: ["admin-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ticket_details", { _ticket_id: ticketId });
      if (error) throw error;
      return data?.[0] as Ticket | undefined;
    },
    enabled: !!ticketId,
  });

  const { data: messages } = useQuery({
    queryKey: ["admin-ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ticket_messages", { _ticket_id: ticketId });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!ticketId,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      const bodyWithSignature = isInternalNote ? replyBody : replyBody + getSignature(selectedMod);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-support-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": "propscholar-admin-secret-2024" },
        body: JSON.stringify({ ticketId, body: bodyWithSignature, isInternalNote, attachments: attachments.length > 0 ? attachments : undefined, senderName: selectedMod }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to send reply");
      return data;
    },
    onSuccess: () => {
      toast.success(isInternalNote ? "Internal note added" : "Reply sent");
      setReplyBody("");
      setIsInternalNote(false);
      setAttachments([]);
      aiEnhancer.clearOptions();
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (error: any) => toast.error("Failed: " + error.message),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} too large`); continue; }
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from('ticket-attachments').upload(fileName, file);
      if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data: publicUrl } = supabase.storage.from('ticket-attachments').getPublicUrl(fileName);
      newAttachments.push({ url: publicUrl.publicUrl, name: file.name, type: file.type, size: file.size });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!ticketId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <StickyNote className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm">Select a ticket to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center gap-3 bg-background/95 backdrop-blur-sm">
        {isMobile && (
          <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted/50">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-muted-foreground font-mono">#{ticket?.ticket_number}</span>
            {ticket?.status && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${statusColors[ticket.status]}`}>
                {statusLabels[ticket.status]}
              </Badge>
            )}
            {ticket?.priority && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 text-muted-foreground border-border/50 capitalize">
                {ticket.priority}
              </Badge>
            )}
          </div>
          <h2 className="text-sm font-semibold truncate">{ticket?.subject}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleDetails}
            className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
            title={showDetails ? "Hide details" : "Show details"}
          >
            {showDetails ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
          <button className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages - scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {/* Tab-like header */}
          <div className="flex items-center gap-4 mb-4 border-b border-border/30 pb-2">
            <button className="text-sm font-medium text-foreground pb-1 border-b-2 border-primary">Tickets</button>
            <button className="text-sm font-medium text-muted-foreground pb-1 hover:text-foreground transition-colors">Internal Note</button>
          </div>

          {messages?.map((message) => (
            <div key={message.id} className="mb-4">
              {/* Sender info */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.is_internal_note
                    ? "bg-yellow-500/15"
                    : message.sender_type === "admin"
                    ? "bg-primary/15"
                    : "bg-muted"
                }`}>
                  {message.is_internal_note ? (
                    <StickyNote className="h-3.5 w-3.5 text-yellow-400" />
                  ) : message.sender_type === "admin" ? (
                    <Headphones className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {message.sender_email}
                  </span>
                  {message.is_internal_note && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">Note</span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(message.created_at), "MMM d, yyyy h:mm a")}
                </span>
              </div>

              {/* Message body */}
              <div className={`ml-10 p-3 rounded-lg text-sm ${
                message.is_internal_note
                  ? "bg-yellow-500/5 border border-yellow-500/20"
                  : message.sender_type === "admin"
                  ? "bg-primary/5 border border-primary/15"
                  : "bg-muted/40 border border-border/30"
              }`}>
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground/90">{children}</p>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                      pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                    }}
                  >
                    {decodeQuotedPrintable(message.body)}
                  </ReactMarkdown>
                </div>

                {/* Attachments */}
                {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Attachments ({message.attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((att: any, idx: number) => {
                        const attachmentUrl = typeof att === 'string' ? att : att.url;
                        const attachmentName = typeof att === 'string' ? `Attachment ${idx + 1}` : (att.filename || att.name || `Attachment ${idx + 1}`);
                        const isImage = attachmentName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        if (!attachmentUrl) return null;
                        return isImage ? (
                          <a key={idx} href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <img src={attachmentUrl} alt={attachmentName} className="h-24 w-24 object-cover rounded-lg border border-border hover:border-primary transition-colors" />
                          </a>
                        ) : (
                          <a key={idx} href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border hover:border-primary transition-colors">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs truncate max-w-[100px]">{attachmentName}</span>
                            <Download className="h-3 w-3" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Sticky Reply Box */}
      <div className="shrink-0 border-t border-border/50 bg-background">
        {/* Reply/Note tabs + AI button */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2">
          <button
            onClick={() => setIsInternalNote(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !isInternalNote
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Send className="h-3 w-3" />
            Reply
          </button>
          <button
            onClick={() => setIsInternalNote(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isInternalNote
                ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <StickyNote className="h-3 w-3" />
            Internal Note
          </button>
          
          {!isInternalNote && (
            <button
              onClick={() => aiEnhancer.handleEnhance(replyBody)}
              disabled={aiEnhancer.isLoading || !replyBody.trim()}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/50 transition-all disabled:opacity-40"
            >
              {aiEnhancer.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              Fix with AI
            </button>
          )}
        </div>

        {/* Markdown toolbar for replies */}
        {!isInternalNote && (
          <div className="px-4">
            <MarkdownToolbar
              textareaRef={replyTextareaRef}
              value={replyBody}
              onChange={setReplyBody}
              showPreview={showMarkdownPreview}
              onTogglePreview={() => setShowMarkdownPreview(!showMarkdownPreview)}
            />
          </div>
        )}

        {/* Textarea */}
        <div className="px-4">
          {showMarkdownPreview && !isInternalNote ? (
            <div className="p-3 bg-muted/30 rounded-b-lg border border-t-0 border-border/50 min-h-[80px] text-sm prose prose-sm prose-invert max-w-none">
              {replyBody ? <ReactMarkdown>{replyBody}</ReactMarkdown> : <p className="text-muted-foreground italic">Nothing to preview</p>}
            </div>
          ) : (
            <textarea
              ref={replyTextareaRef}
              placeholder={isInternalNote ? "Add an internal note..." : "Write your reply in Markdown..."}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
              className={`w-full p-3 bg-muted/20 text-foreground resize-none min-h-[80px] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                !isInternalNote ? "rounded-b-lg border border-t-0 border-border/50" : "rounded-lg border border-border/50"
              }`}
            />
          )}
        </div>

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group flex items-center gap-1 p-1.5 bg-muted/50 rounded-md border border-border/50 text-xs">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{att.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="ml-1 text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Options */}
        {!isInternalNote && aiEnhancer.options.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {aiEnhancer.options.map((option) => (
                <button
                  key={option.type}
                  onClick={() => { aiEnhancer.setSelectedType(option.type); setReplyBody(option.content); toast.success(`${option.label} applied`); }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    aiEnhancer.selectedType === option.type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom bar: moderators + actions */}
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Moderator pills - only for replies */}
          {!isInternalNote && (
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
              {moderators.map((mod) => (
                <button
                  key={mod.name}
                  onClick={() => setSelectedMod(mod.name)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    selectedMod === mod.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedMod === mod.name ? "bg-primary-foreground" : "bg-muted-foreground/50"}`} />
                  {mod.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" multiple className="hidden" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-8 px-2"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => sendReplyMutation.mutate()}
              disabled={!replyBody.trim() || sendReplyMutation.isPending || isUploading}
              className="h-8 px-4 gap-1.5"
            >
              {sendReplyMutation.isPending ? "Sending..." : isInternalNote ? "Save Note" : "Send Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
