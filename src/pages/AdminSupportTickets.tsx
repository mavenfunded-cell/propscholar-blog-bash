import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation } from "@/hooks/useAdminSubdomain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Mail,
  Search,
  RefreshCw,
  MessageSquare,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Bot,
  FileText,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketSource = "email" | "chatbot" | "form";

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

const sourceColors: Record<TicketSource, string> = {
  email: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  chatbot: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  form: "bg-green-500/15 text-green-400 border border-green-500/30",
};

const sourceLabels: Record<TicketSource, string> = {
  email: "Email",
  chatbot: "Chatbot",
  form: "Form",
};

const SourceIcon = ({ source }: { source: TicketSource }) => {
  const iconClass = "h-3 w-3";
  switch (source) {
    case "chatbot":
      return <Bot className={iconClass} />;
    case "form":
      return <FileText className={iconClass} />;
    default:
      return <Mail className={iconClass} />;
  }
};

const getDisplayStatus = (status: TicketStatus): "open" | "closed" => {
  return status === "closed" ? "closed" : "open";
};

const statusColors: Record<"open" | "closed", string> = {
  open: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  closed: "bg-muted/80 text-muted-foreground border border-border/50",
};

const statusLabels: Record<"open" | "closed", string> = {
  open: "Open",
  closed: "Closed",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-muted/80 text-muted-foreground border border-border/50",
  medium: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  high: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  urgent: "bg-red-500/15 text-red-400 border border-red-500/30",
};

const AdminSupportTickets = () => {
  const navigate = useNavigate();
  const { adminNavigate, getLoginPath } = useAdminNavigation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    processed: number;
    errors: number;
    timestamp: string;
  } | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        navigate(getLoginPath(), { replace: true });
        return;
      }
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!roleData);
      if (!roleData) {
        navigate(getLoginPath(), { replace: true });
      }
    };
    
    checkAuth();
  }, [navigate, getLoginPath]);

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_support_tickets", {
        _status_filter: statusFilter,
        _priority_filter: priorityFilter,
      });
      if (error) throw error;
      return data as Ticket[];
    },
    enabled: isAdmin === true,
  });

  const syncInboxMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("poll-imap-inbox");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setLastSyncResult(data);
      if (data.processed > 0) {
        toast.success(`Synced ${data.processed} new email(s)`);
        queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      } else {
        toast.info("No new emails found");
      }
    },
    onError: (error: any) => {
      toast.error("Sync failed: " + error.message);
      setLastSyncResult({
        success: false,
        processed: 0,
        errors: 1,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-update-ticket-status",
        {
          body: { ticketId, status: "closed" },
        },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to close ticket");
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket closed");
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (error: any) => {
      toast.error("Close failed: " + (error?.message || "Unknown error"));
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    // Source filter
    if (sourceFilter !== "all" && ticket.source !== sourceFilter) return false;
    
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.user_email.toLowerCase().includes(query) ||
      ticket.ticket_number.toString().includes(query)
    );
  });

  const ticketCounts = {
    all: tickets?.length || 0,
    open: tickets?.filter((t) => t.status !== "closed").length || 0,
    closed: tickets?.filter((t) => t.status === "closed").length || 0,
  };

  const sourceCounts = {
    all: tickets?.length || 0,
    email: tickets?.filter((t) => !t.source || t.source === "email").length || 0,
    chatbot: tickets?.filter((t) => t.source === "chatbot" || t.source === "form").length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => adminNavigate("/dashboard")}
                className="rounded-full hover:bg-muted/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Support Tickets
                </h1>
                <p className="text-sm text-muted-foreground">Manage customer support requests</p>
              </div>
            </div>
            <AdminNotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Email Sync Section */}
        <Card className="border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Inbox className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Email Inbox Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Syncing support@propscholar.com (Hostinger)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400">Auto-sync active</span>
                  <span className="text-xs text-muted-foreground">(every 1 min)</span>
                </div>

                {lastSyncResult && (
                  <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-muted/50">
                    {lastSyncResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      Last: {format(new Date(lastSyncResult.timestamp), "h:mm a")}
                    </span>
                    {lastSyncResult.processed > 0 && (
                      <Badge
                        variant="outline"
                        className="rounded-full bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      >
                        +{lastSyncResult.processed}
                      </Badge>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => syncInboxMutation.mutate()}
                  disabled={syncInboxMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="rounded-lg gap-2 border-border/50"
                >
                  {syncInboxMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Source Tabs */}
        <div className="flex gap-2 p-1 bg-muted/30 rounded-xl w-fit">
          {[
            { key: "all", label: "All Tickets", icon: MessageSquare, count: sourceCounts.all },
            { key: "email", label: "Email", icon: Mail, count: sourceCounts.email },
            { key: "chatbot", label: "Chatbot/Form", icon: Bot, count: sourceCounts.chatbot },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sourceFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                sourceFilter === tab.key 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: "open", label: "Open", count: ticketCounts.open, icon: Mail, color: "text-emerald-400" },
            { key: "all", label: "All Tickets", count: ticketCounts.all, icon: MessageSquare, color: "text-muted-foreground" },
            { key: "closed", label: "Closed", count: ticketCounts.closed, icon: CheckCircle2, color: "text-muted-foreground" },
          ].map((stat) => (
            <Card
              key={stat.key}
              className={`cursor-pointer transition-all border-border/50 bg-card/50 hover:bg-card/80 hover:border-border/80 ${
                statusFilter === stat.key ? "border-primary/50 bg-primary/5" : ""
              }`}
              onClick={() => setStatusFilter(stat.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{stat.count}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${statusFilter === stat.key ? 'bg-primary/10' : 'bg-muted/50'}`}>
                    <stat.icon
                      className={`h-5 w-5 ${
                        statusFilter === stat.key ? "text-primary" : stat.color
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject, email, or ticket #"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg border-border/50 bg-background/50"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40 rounded-lg border-border/50">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} className="rounded-lg border-border/50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="border-border/50 bg-card/50 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading tickets...
              </div>
            ) : filteredTickets?.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-1">No tickets found</h3>
                <p className="text-sm text-muted-foreground">Click "Sync Now" to check for new emails</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-20 text-xs font-medium text-muted-foreground">#</TableHead>
                      <TableHead className="w-20 text-xs font-medium text-muted-foreground">Source</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Subject</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">From</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="w-24 text-xs font-medium text-muted-foreground">Priority</TableHead>
                      <TableHead className="w-36 text-xs font-medium text-muted-foreground">Last Reply</TableHead>
                      <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets?.map((ticket) => {
                      const isClosed = ticket.status === "closed";
                      return (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer border-border/30 hover:bg-muted/30"
                          onClick={() => adminNavigate(`/tickets/${ticket.id}`)}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            #{ticket.ticket_number}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2 gap-1 ${sourceColors[ticket.source || 'email']}`}
                            >
                              <SourceIcon source={ticket.source || 'email'} />
                              {sourceLabels[ticket.source || 'email']}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{ticket.subject}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{ticket.user_email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 ${statusColors[getDisplayStatus(ticket.status)]}`}
                            >
                              {statusLabels[getDisplayStatus(ticket.status)]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 capitalize ${priorityColors[ticket.priority]}`}
                            >
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="text-muted-foreground">
                              {formatDistanceToNow(new Date(ticket.last_reply_at), {
                                addSuffix: true,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground/60">by {ticket.last_reply_by}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg h-8 border-border/50"
                              disabled={isClosed || closeTicketMutation.isPending}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                closeTicketMutation.mutate(ticket.id);
                              }}
                            >
                              {isClosed ? "Closed" : "Close"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminSupportTickets;
