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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Mail, 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Inbox, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Loader2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  user_email: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  last_reply_at: string;
  last_reply_by: string;
}

// Display status - treat awaiting_support and awaiting_user as "open"
const getDisplayStatus = (status: TicketStatus): "open" | "closed" => {
  return status === "closed" ? "closed" : "open";
};

const statusColors: Record<"open" | "closed", string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<"open" | "closed", string> = {
  open: "Open",
  closed: "Closed",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AdminSupportTickets = () => {
  const navigate = useNavigate();
  const { adminNavigate, getLoginPath } = useAdminNavigation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    processed: number;
    errors: number;
    timestamp: string;
  } | null>(null);

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(getLoginPath(), { replace: true });
    }
  }, [isLoggedIn, navigate, getLoginPath]);

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_support_tickets', {
        _status_filter: statusFilter,
        _priority_filter: priorityFilter
      });
      if (error) throw error;
      return data as Ticket[];
    },
    enabled: isLoggedIn,
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
      setLastSyncResult({ success: false, processed: 0, errors: 1, timestamp: new Date().toISOString() });
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => adminNavigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              Support Tickets
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer support requests
            </p>
          </div>
        </div>

        {/* Email Sync Section */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Inbox className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email Inbox Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Syncing support@propscholar.com (Hostinger)
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Auto-sync status indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
                  </div>
                  <span className="text-xs font-medium text-green-400">Auto-sync active</span>
                  <span className="text-xs text-muted-foreground">(every 1 min)</span>
                </div>

                {lastSyncResult && (
                  <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-muted/50">
                    {lastSyncResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      Last: {format(new Date(lastSyncResult.timestamp), "h:mm a")}
                    </span>
                    {lastSyncResult.processed > 0 && (
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
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
                  className="gap-2"
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

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { key: "open", label: "Open", count: ticketCounts.open, icon: Mail },
            { key: "all", label: "All Tickets", count: ticketCounts.all, icon: MessageSquare },
            { key: "closed", label: "Closed", count: ticketCounts.closed, icon: CheckCircle2 },
          ].map((stat) => (
            <Card
              key={stat.key}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                statusFilter === stat.key ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => setStatusFilter(stat.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <stat.icon className={`h-5 w-5 ${statusFilter === stat.key ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject, email, or ticket #"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-40">
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
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading tickets...
              </div>
            ) : filteredTickets?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets found</p>
                <p className="text-sm mt-2">Click "Sync Now" to check for new emails</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">#</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-28">Priority</TableHead>
                    <TableHead className="w-40">Last Reply</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets?.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => adminNavigate(`/tickets/${ticket.id}`)}
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        #{ticket.ticket_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.user_email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[getDisplayStatus(ticket.status)]}
                        >
                          {statusLabels[getDisplayStatus(ticket.status)]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={priorityColors[ticket.priority]}
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          {formatDistanceToNow(new Date(ticket.last_reply_at), {
                            addSuffix: true,
                          })}
                        </div>
                        <div className="text-xs opacity-70">
                          by {ticket.last_reply_by}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSupportTickets;
