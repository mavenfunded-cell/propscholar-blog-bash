import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Mail, Bot, Sparkles, FileText, MoreHorizontal, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TicketSource = "email" | "chatbot" | "form" | "dash";
type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  user_email: string;
  status: TicketStatus;
  priority: TicketPriority;
  source?: TicketSource;
  created_at: string;
  updated_at: string;
  last_reply_at: string;
  last_reply_by: string;
}

interface TicketListPanelProps {
  tickets: Ticket[] | undefined;
  isLoading: boolean;
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
}

const sourceIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  chatbot: <Bot className="h-3 w-3" />,
  form: <FileText className="h-3 w-3" />,
  dash: <Sparkles className="h-3 w-3" />,
};

const statusDotColors: Record<string, string> = {
  open: "bg-emerald-500",
  awaiting_support: "bg-orange-500",
  awaiting_user: "bg-blue-500",
  closed: "bg-muted-foreground/40",
};

const priorityDotColors: Record<TicketPriority, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function TicketListPanel({
  tickets,
  isLoading,
  selectedTicketId,
  onSelectTicket,
  statusFilter,
  onStatusFilterChange,
}: TicketListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = tickets?.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.user_email.toLowerCase().includes(q) ||
      t.ticket_number.toString().includes(q)
    );
  });

  const counts = {
    all: tickets?.length || 0,
    open: tickets?.filter((t) => t.status !== "closed").length || 0,
    closed: tickets?.filter((t) => t.status === "closed").length || 0,
  };

  return (
    <div className="flex flex-col h-full border-r border-border/50 bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Tickets</h2>
          </div>
          <button className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/30 border-border/50 rounded-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 p-0.5 bg-muted/30 rounded-lg">
          {[
            { key: "open", label: "Open", count: counts.open },
            { key: "all", label: "All", count: counts.all },
            { key: "closed", label: "Closed", count: counts.closed },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                statusFilter === tab.key
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : filtered?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No tickets found</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered?.map((ticket) => {
              const isSelected = ticket.id === selectedTicketId;
              const isClosed = ticket.status === "closed";
              const isUserReply = ticket.last_reply_by !== "admin";

              return (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className={`w-full text-left p-3.5 transition-all hover:bg-muted/40 ${
                    isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${
                      isClosed ? "bg-muted/50 text-muted-foreground" : "bg-primary/15 text-primary"
                    }`}>
                      {sourceIcons[ticket.source || "email"]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-sm font-medium truncate ${isClosed ? "text-muted-foreground" : ""}`}>
                          {ticket.user_email.split("@")[0]}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(ticket.last_reply_at), { addSuffix: false })}
                        </span>
                      </div>

                      <p className={`text-sm truncate mb-1 ${isClosed ? "text-muted-foreground/70" : "font-medium"}`}>
                        {ticket.subject}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {/* Status dot */}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColors[ticket.status]}`} />
                        
                        {/* Priority dot */}
                        {ticket.priority !== "low" && (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDotColors[ticket.priority]}`} />
                        )}

                        {/* Source badge */}
                        {ticket.source && ticket.source !== "email" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground capitalize">
                            {ticket.source}
                          </span>
                        )}

                        <span className="flex-1" />

                        {/* Unread indicator - user replied */}
                        {isUserReply && !isClosed && (
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                            1
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
