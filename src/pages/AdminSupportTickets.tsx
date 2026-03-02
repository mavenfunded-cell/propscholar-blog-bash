import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNavigation } from "@/hooks/useAdminSubdomain";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { TicketListPanel } from "@/components/admin/tickets/TicketListPanel";
import { TicketChatPanel } from "@/components/admin/tickets/TicketChatPanel";
import { TicketDetailsPanel } from "@/components/admin/tickets/TicketDetailsPanel";

type TicketStatus = "open" | "awaiting_support" | "awaiting_user" | "closed";

const AdminSupportTickets = () => {
  const navigate = useNavigate();
  const { id: urlTicketId } = useParams<{ id?: string }>();
  const { adminNavigate, getLoginPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(urlTicketId || null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showDetails, setShowDetails] = useState(false);

  const isAdmin = authLoading ? null : isLoggedIn;

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) navigate(getLoginPath(), { replace: true });
  }, [authLoading, isLoggedIn, navigate, getLoginPath]);

  // Auto-sync every 60s
  useEffect(() => {
    if (isAdmin !== true) return;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("poll-imap-inbox");
        if (!error && data?.processed > 0) {
          queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        }
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, queryClient]);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_support_tickets", {
        _status_filter: statusFilter,
        _priority_filter: priorityFilter,
      });
      if (error) throw error;
      return (data as any[])?.sort(
        (a: any, b: any) => new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime()
      );
    },
    enabled: isAdmin === true,
  });

  const handleSelectTicket = (id: string) => {
    setSelectedTicketId(id);
  };

  const handleInsertReply = (content: string) => {
    window.dispatchEvent(new CustomEvent("insert-reply", { detail: content }));
  };

  const hasTicket = !!selectedTicketId;

  // On mobile, show either list or chat
  if (isMobile) {
    if (selectedTicketId) {
      return (
        <div className="h-screen flex flex-col">
          <TicketChatPanel
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails(!showDetails)}
            isMobile
          />
        </div>
      );
    }
    return (
      <div className="h-screen">
        <TicketListPanel
          tickets={tickets}
          isLoading={isLoading}
          selectedTicketId={selectedTicketId}
          onSelectTicket={handleSelectTicket}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>
    );
  }

  // Desktop: CSS-driven layout with smooth transitions (no conditional panel mounting)
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left: Ticket List */}
      <div
        className="shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-r border-border/50"
        style={{ width: hasTicket ? 320 : "100%" }}
      >
        <TicketListPanel
          tickets={tickets}
          isLoading={isLoading}
          selectedTicketId={selectedTicketId}
          onSelectTicket={handleSelectTicket}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* Center: Chat - always rendered, visibility controlled */}
      <div
        className="flex-1 min-w-0 transition-all duration-300 ease-in-out"
        style={{
          opacity: hasTicket ? 1 : 0,
          pointerEvents: hasTicket ? "auto" : "none",
        }}
      >
        <TicketChatPanel
          ticketId={selectedTicketId}
          onBack={() => setSelectedTicketId(null)}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails(!showDetails)}
          isMobile={false}
        />
      </div>

      {/* Right: Details - slide in/out */}
      <div
        className="shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          width: hasTicket && showDetails ? 340 : 0,
          opacity: hasTicket && showDetails ? 1 : 0,
        }}
      >
        <div style={{ width: 340 }}>
          <TicketDetailsPanel
            ticketId={selectedTicketId}
            onInsertReply={handleInsertReply}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTickets;
