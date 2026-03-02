import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mail,
  Clock,
  Phone,
  Bot,
  User,
  ChevronDown,
  MessageCircle,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import AISuggestionsSidebar from "@/components/AISuggestionsSidebar";

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface ChatMessage {
  role: "user" | "bot" | "assistant";
  content: string;
  timestamp?: string;
}

interface TicketDetailsPanelProps {
  ticketId: string | null;
  onInsertReply: (content: string) => void;
}

const sourceLabels: Record<string, string> = {
  email: "Email Ticket",
  chatbot: "Chatbot Ticket",
  form: "Form Ticket",
  dash: "Dash Ticket",
};

const sourceColors: Record<string, string> = {
  email: "text-blue-400",
  chatbot: "text-purple-400",
  form: "text-green-400",
  dash: "text-foreground",
};

export function TicketDetailsPanel({ ticketId, onInsertReply }: TicketDetailsPanelProps) {
  const queryClient = useQueryClient();
  const [aiOpen, setAiOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [internalNote, setInternalNote] = useState("");

  const { data: ticket } = useQuery({
    queryKey: ["admin-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ticket_details", { _ticket_id: ticketId });
      if (error) throw error;
      const raw = data?.[0];
      if (!raw) return null;
      return {
        ...raw,
        chat_history: raw.chat_history ? (raw.chat_history as unknown as ChatMessage[]) : undefined,
      } as any;
    },
    enabled: !!ticketId,
  });

  const { data: messages } = useQuery({
    queryKey: ["admin-ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ticket_messages", { _ticket_id: ticketId });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ticketId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TicketStatus) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-update-ticket-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": "propscholar-admin-secret-2024" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TicketPriority) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Priority updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket", ticketId] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const saveInternalNote = useMutation({
    mutationFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-support-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": "propscholar-admin-secret-2024" },
        body: JSON.stringify({ ticketId, body: internalNote, isInternalNote: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Note saved");
      setInternalNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", ticketId] });
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  if (!ticketId || !ticket) {
    return (
      <div className="h-full border-l border-border/50 bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a ticket</p>
      </div>
    );
  }

  return (
    <div className="border-l border-border/50 bg-background flex flex-col h-full">
      {/* AI Suggestions - Collapsible */}
      <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full shrink-0 p-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">AI Suggestions</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${aiOpen ? "" : "-rotate-90"}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200">
          {messages && (
            <div className="border-b border-border/50">
              <AISuggestionsSidebar
                ticketId={ticketId}
                messages={messages}
                onInsertReply={onInsertReply}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Ticket Details - Collapsible */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full shrink-0 p-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <span className="text-sm font-semibold">Ticket Details & Actions</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${detailsOpen ? "" : "-rotate-90"}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Status */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Status</label>
                <Select value={ticket.status} onValueChange={(v) => updateStatusMutation.mutate(v as TicketStatus)}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
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

              {/* Priority */}
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Priority</label>
                <Select value={ticket.priority} onValueChange={(v) => updatePriorityMutation.mutate(v as TicketPriority)}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
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

              {/* Customer */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Customer</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-primary">{ticket.user_email}</span>
                  </div>
                  {ticket.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`tel:${ticket.phone}`} className="text-sm text-primary hover:underline">{ticket.phone}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {ticket.source && (
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`text-xs font-medium ${sourceColors[ticket.source] || "text-muted-foreground"}`}>
                        {sourceLabels[ticket.source] || ticket.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chatbot context */}
              {ticket.chat_history && ticket.chat_history.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-purple-400" />
                    <h4 className="text-sm font-semibold">Chatbot Context</h4>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {ticket.chat_history.map((msg: ChatMessage, idx: number) => (
                      <div key={idx} className={`p-2 rounded text-xs ${msg.role === "user" ? "bg-muted/50 ml-3" : "bg-purple-500/10 mr-3"}`}>
                        <span className="text-[10px] text-muted-foreground capitalize block mb-0.5">{msg.role}</span>
                        <p className="text-foreground/90">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Note */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-yellow-400" />
                  Internal Note
                </h4>
                <Textarea
                  placeholder="Enter note here..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={3}
                  className="text-sm bg-muted/20 border-border/50 resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  disabled={!internalNote.trim() || saveInternalNote.isPending}
                  onClick={() => saveInternalNote.mutate()}
                >
                  {saveInternalNote.isPending ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
