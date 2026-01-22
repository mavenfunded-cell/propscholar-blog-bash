import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation, isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  User,
  Headphones,
  Clock,
  Mail,
  StickyNote,
  Bot,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  ImageIcon,
  Download,
  FileText,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import AISuggestionsSidebar from "@/components/AISuggestionsSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import { MarkdownToolbar } from "@/components/MarkdownToolbar";
import { FixWithAIButton, AIOptionsPanel, useReplyAIEnhancer } from "@/components/admin/ReplyAIEnhancer";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  user_email: string;
  user_id: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  last_reply_at: string;
  closed_at: string | null;
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

const statusColors: Record<TicketStatus, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  awaiting_support: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  awaiting_user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  awaiting_support: "Awaiting Support",
  awaiting_user: "Awaiting User",
  closed: "Closed",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AdminTicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adminNavigate } = useAdminNavigation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [replyBody, setReplyBody] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(false); // Start closed on mobile
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMod, setSelectedMod] = useState("Chirag C");
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // AI Enhancer hook
  const aiEnhancer = useReplyAIEnhancer();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin authentication via Supabase
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        navigate(isAdminSubdomain() ? '/' : '/admin');
        return;
      }
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleData) {
        setIsAdmin(false);
        navigate(isAdminSubdomain() ? '/' : '/admin');
        return;
      }
      
      setIsAdmin(true);
    };
    
    checkAuth();
  }, [navigate]);

  // Listen for close event from AI sidebar
  useEffect(() => {
    const handleCloseAISidebar = () => setShowAISidebar(false);
    window.addEventListener('close-ai-sidebar', handleCloseAISidebar);
    return () => window.removeEventListener('close-ai-sidebar', handleCloseAISidebar);
  }, []);

  // On desktop, show AI sidebar by default
  useEffect(() => {
    if (!isMobile) {
      setShowAISidebar(true);
    }
  }, [isMobile]);

  const moderators = [
    { name: "Chirag C", isDefault: true },
    { name: "Ben K", isDefault: false },
    { name: "Harris", isDefault: false },
    { name: "Sikha", isDefault: false },
    { name: "Rose", isDefault: false },
  ];

  // Signature template - appended when sending, not shown in textarea
  const getSignature = (modName: string) => `\n\nBest Regards,\n${modName}\nPropScholar Support`;

  // Decode quoted-printable encoding from emails (e.g., =E2=80=99 -> ')
  const decodeQuotedPrintable = (text: string): string => {
    if (!text) return text;
    
    // First handle soft line breaks (= at end of line)
    let decoded = text.replace(/=\r?\n/g, '');
    
    // Then decode =XX hex patterns to bytes and convert from UTF-8
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
        // Regular character - flush any pending bytes first
        if (bytes.length > 0) {
          const decodedChunk = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
          decoded = decoded.substring(0, i - bytes.length * 3) + decodedChunk + decoded.substring(i);
          i = i - bytes.length * 3 + decodedChunk.length;
          bytes.length = 0;
        }
        i++;
      }
      // Handle any remaining bytes at the end
      if (bytes.length > 0) {
        const decodedChunk = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
        decoded = decoded.substring(0, decoded.length - bytes.length * 3) + decodedChunk;
      }
    } catch {
      // If decoding fails, return original with simple replacement
      decoded = text
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
    
    return decoded;
  };

  const handleInsertReply = (content: string) => {
    setReplyBody(content);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        console.error('Upload error:', error);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      newAttachments.push({
        url: publicUrl.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ticket_details', { _ticket_id: id });
      if (error) throw error;
      return data?.[0] as Ticket;
    },
    enabled: !!id && isAdmin === true,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-ticket-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ticket_messages', { _ticket_id: id });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!id && isAdmin === true,
  });

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      // Append signature to reply body for non-internal notes
      const bodyWithSignature = isInternalNote 
        ? replyBody 
        : replyBody + getSignature(selectedMod);

      // Get access token for JWT auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }
      
      const { data, error } = await supabase.functions.invoke("send-support-email", {
        body: {
          ticketId: id,
          body: bodyWithSignature,
          isInternalNote,
          attachments: attachments.length > 0 ? attachments : undefined,
          senderName: selectedMod,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isInternalNote ? "Internal note added" : "Reply sent successfully");
      setReplyBody("");
      setIsInternalNote(false);
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    },
    onError: (error: any) => {
      toast.error("Failed to send reply: " + error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TicketStatus) => {
      // Get access token for JWT auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke(
        "admin-update-ticket-status",
        {
          body: {
            ticketId: id,
            status: newStatus,
          },
        },
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to update status");
      return data;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (error: any) => {
      toast.error("Failed to update status: " + (error?.message || "Unknown error"));
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TicketPriority) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Priority updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    },
    onError: (error: any) => {
      toast.error("Failed to update priority: " + error.message);
    },
  });

  if (ticketLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-4 lg:py-8 px-3 lg:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => adminNavigate("/tickets")}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground font-mono text-sm">
                  #{ticket.ticket_number}
                </span>
                <Badge variant="outline" className={`${statusColors[ticket.status]} text-xs`}>
                  {statusLabels[ticket.status]}
                </Badge>
                <Badge variant="outline" className={`${priorityColors[ticket.priority]} text-xs`}>
                  {ticket.priority}
                </Badge>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold mt-1 line-clamp-2">{ticket.subject}</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAISidebar(!showAISidebar)}
            className="shrink-0 self-start sm:self-auto"
          >
            {showAISidebar ? (
              <>
                <PanelRightClose className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Hide AI</span>
                <span className="sm:hidden">AI</span>
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Show AI</span>
                <span className="sm:hidden">AI</span>
              </>
            )}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Messages Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Messages */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Conversation</CardTitle>
                {messages && messages.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullConversation(!showFullConversation)}
                    className="text-xs"
                  >
                    {showFullConversation ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        View Full ({messages.length} messages)
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {(showFullConversation ? messages : messages?.slice(-2))?.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.is_internal_note
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : message.sender_type === "admin"
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`p-1.5 rounded-full ${
                          message.is_internal_note
                            ? "bg-yellow-500/20"
                            : message.sender_type === "admin"
                            ? "bg-primary/20"
                            : "bg-muted-foreground/20"
                        }`}
                      >
                        {message.is_internal_note ? (
                          <StickyNote className="h-4 w-4 text-yellow-400" />
                        ) : message.sender_type === "admin" ? (
                          <Headphones className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-sm">
                          {message.sender_name || message.sender_email}
                        </span>
                        {message.is_internal_note && (
                          <span className="text-xs text-yellow-400 ml-2">
                            Internal Note
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap pl-8 prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {children}
                            </a>
                          ),
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>
                          ),
                        }}
                      >
                        {decodeQuotedPrintable(message.body)}
                      </ReactMarkdown>
                    </div>
                    {/* Display attachments - handle both URL format and object format */}
                    {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                      <div className="pl-8 mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          Attachments ({message.attachments.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((att: any, idx: number) => {
                            // Handle different attachment formats
                            const attachmentUrl = typeof att === 'string' ? att : att.url;
                            const attachmentName = typeof att === 'string' ? `Attachment ${idx + 1}` : (att.filename || att.name || `Attachment ${idx + 1}`);
                            const attachmentType = typeof att === 'string' 
                              ? (att.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/' : 'file')
                              : (att.contentType || att.type || '');
                            const isImage = attachmentType.startsWith('image/') || 
                              attachmentName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                              (typeof attachmentUrl === 'string' && attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                            
                            if (!attachmentUrl) return null;
                            
                            return (
                              <div key={idx} className="relative group">
                                {isImage ? (
                                  <a 
                                    href={attachmentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img 
                                      src={attachmentUrl} 
                                      alt={attachmentName}
                                      className="h-32 w-32 object-cover rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                                      onError={(e) => {
                                        // If image fails to load, show placeholder
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden items-center gap-2 p-2 bg-muted rounded-lg border border-border">
                                      <ImageIcon className="h-4 w-4" />
                                      <span className="text-xs truncate max-w-[100px]">{attachmentName}</span>
                                    </div>
                                  </a>
                                ) : (
                                  <a 
                                    href={attachmentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border hover:border-primary transition-colors"
                                  >
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium truncate max-w-[120px]">{attachmentName}</span>
                                      {att.size && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {(att.size / 1024).toFixed(1)} KB
                                        </span>
                                      )}
                                    </div>
                                    <Download className="h-4 w-4 ml-1" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Reply Box */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant={!isInternalNote ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsInternalNote(false)}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Reply
                  </Button>
                  <Button
                    variant={isInternalNote ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsInternalNote(true)}
                    className={isInternalNote ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                  >
                    <StickyNote className="h-4 w-4 mr-1" />
                    Internal Note
                  </Button>
                  
                  {/* Fix with AI Button */}
                  {!isInternalNote && (
                    <FixWithAIButton
                      onClick={() => aiEnhancer.handleEnhance(replyBody)}
                      isLoading={aiEnhancer.isLoading}
                      disabled={!replyBody.trim()}
                    />
                  )}
                </div>
                
                {/* Markdown Toolbar - only for replies */}
                {!isInternalNote && (
                  <MarkdownToolbar
                    textareaRef={replyTextareaRef}
                    value={replyBody}
                    onChange={setReplyBody}
                    showPreview={showMarkdownPreview}
                    onTogglePreview={() => setShowMarkdownPreview(!showMarkdownPreview)}
                  />
                )}
                
                {showMarkdownPreview && !isInternalNote ? (
                  <div className="p-4 bg-muted/50 rounded-b-lg border border-t-0 border-border min-h-[120px] prose prose-sm prose-invert max-w-none mb-3">
                    {replyBody ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {children}
                            </a>
                          ),
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>
                          ),
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground">{children}</blockquote>
                          ),
                          hr: () => <hr className="my-3 border-border" />,
                        }}
                      >
                        {replyBody}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic">Nothing to preview</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    ref={replyTextareaRef}
                    placeholder={
                      isInternalNote
                        ? "Add an internal note (only visible to admins)..."
                        : "Write your reply in Markdown..."
                    }
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={6}
                    className={`w-full p-3 bg-background text-foreground resize-y min-h-[120px] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary mb-3 ${
                      !isInternalNote ? "rounded-b-lg border border-t-0 border-border" : "rounded-lg border border-border"
                    }`}
                  />
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      Attachments ({attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="relative group">
                          {att.type.startsWith('image/') ? (
                            <div className="relative">
                              <img 
                                src={att.url} 
                                alt={att.name}
                                className="h-16 w-16 object-cover rounded-lg border border-border"
                              />
                              <button
                                onClick={() => removeAttachment(idx)}
                                className="absolute -top-1 -right-1 p-0.5 bg-destructive rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex items-center gap-1 p-2 bg-background rounded-lg border border-border">
                              <Paperclip className="h-3 w-3" />
                              <span className="text-xs truncate max-w-[80px]">{att.name}</span>
                              <button
                                onClick={() => removeAttachment(idx)}
                                className="ml-1 p-0.5 bg-destructive rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderator Selector - only show for replies, not internal notes */}
                {!isInternalNote && (
                  <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="text-xs text-muted-foreground shrink-0">Reply as:</span>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {moderators.map((mod) => (
                        <button
                          key={mod.name}
                          type="button"
                          onClick={() => setSelectedMod(mod.name)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                            selectedMod === mod.name
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <span 
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                              selectedMod === mod.name 
                                ? "bg-primary-foreground" 
                                : "bg-muted-foreground/50"
                            }`}
                          />
                          {mod.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}


                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Paperclip className="h-4 w-4 mr-1" />
                          Attach
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => sendReplyMutation.mutate()}
                    disabled={!replyBody.trim() || sendReplyMutation.isPending || isUploading}
                  >
                    {sendReplyMutation.isPending
                      ? "Sending..."
                      : isInternalNote
                      ? "Add Note"
                      : "Send Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Ticket Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Status
                  </label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate(value as TicketStatus)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="awaiting_support">Awaiting Support</SelectItem>
                      <SelectItem value="awaiting_user">Awaiting User</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Priority
                  </label>
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) =>
                      updatePriorityMutation.mutate(value as TicketPriority)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.user_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </span>
                </div>
                {ticket.closed_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Closed {formatDistanceToNow(new Date(ticket.closed_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Enhanced Options Panel */}
            {!isInternalNote && aiEnhancer.options.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-primary">✨</span> AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AIOptionsPanel
                    options={aiEnhancer.options}
                    selectedType={aiEnhancer.selectedType}
                    onSelectOption={(option) => {
                      aiEnhancer.setSelectedType(option.type);
                      setReplyBody(option.content);
                      toast.success(`${option.label} version applied`);
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* AI Suggestions Sidebar */}
      {showAISidebar && messages && (
        <AISuggestionsSidebar
          ticketId={id || ""}
          messages={messages}
          onInsertReply={handleInsertReply}
        />
      )}
    </div>
  );
};

export default AdminTicketDetail;
