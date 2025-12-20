import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation } from "@/hooks/useAdminSubdomain";
import { useAuth } from "@/contexts/AuthContext";
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
  Image as ImageIcon,
  Download,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import AISuggestionsSidebar from "@/components/AISuggestionsSidebar";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

type TicketStatus = "open" | "closed";
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
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
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
  const { adminNavigate } = useAdminNavigation();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(true);
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Ticket;
    },
    enabled: !!id,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-ticket-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!id,
  });

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-support-email", {
        body: {
          ticketId: id,
          body: replyBody,
          isInternalNote,
          attachments: attachments.length > 0 ? attachments : undefined,
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
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "closed") {
        updates.closed_at = new Date().toISOString();
      } else {
        updates.closed_at = null;
      }
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // Send ticket closed email when status changes to closed
      if (newStatus === "closed" && ticket) {
        try {
          const { error: emailError } = await supabase.functions.invoke("ticket-closed-email", {
            body: {
              to: ticket.user_email,
              ticketNumber: ticket.ticket_number,
              ticketId: ticket.id,
              subject: ticket.subject,
            },
          });
          if (emailError) {
            console.error("Failed to send closed email:", emailError);
          }
        } catch (e) {
          console.error("Error sending closed email:", e);
        }
      }
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", id] });
    },
    onError: (error: any) => {
      toast.error("Failed to update status: " + error.message);
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
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => adminNavigate("/tickets")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-mono">
                #{ticket.ticket_number}
              </span>
              <Badge variant="outline" className={statusColors[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
              <Badge variant="outline" className={priorityColors[ticket.priority]}>
                {ticket.priority}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold mt-1">{ticket.subject}</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAISidebar(!showAISidebar)}
            className="ml-auto"
          >
            {showAISidebar ? (
              <>
                <PanelRightClose className="h-4 w-4 mr-2" />
                Hide AI
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Show AI
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
                    <p className="text-sm whitespace-pre-wrap pl-8">
                      {message.body}
                    </p>
                    {/* Display attachments */}
                    {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                      <div className="pl-8 mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          Attachments ({message.attachments.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((att: Attachment, idx: number) => (
                            <div key={idx} className="relative group">
                              {att.type?.startsWith('image/') ? (
                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={att.url} 
                                    alt={att.name}
                                    className="h-24 w-24 object-cover rounded-lg border border-border hover:border-primary transition-colors"
                                  />
                                </a>
                              ) : (
                                <a 
                                  href={att.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border hover:border-primary transition-colors"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="text-xs truncate max-w-[120px]">{att.name}</span>
                                </a>
                              )}
                            </div>
                          ))}
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
                </div>
                <Textarea
                  placeholder={
                    isInternalNote
                      ? "Add an internal note (only visible to admins)..."
                      : "Type your reply (will be sent via email)..."
                  }
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={4}
                  className="mb-3"
                />

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
                    value={ticket.status === "closed" ? "closed" : "open"}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate(value as TicketStatus)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
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
