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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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

  // Desktop: resizable 3-panel layout
  return (
    <div className="h-screen flex overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Ticket List - resizable */}
        <ResizablePanel
          defaultSize={selectedTicketId ? 22 : 100}
          minSize={15}
          maxSize={selectedTicketId ? 40 : 100}
          className="transition-all duration-300 ease-in-out"
        >
          <TicketListPanel
            tickets={tickets}
            isLoading={isLoading}
            selectedTicketId={selectedTicketId}
            onSelectTicket={handleSelectTicket}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </ResizablePanel>

        {/* Show chat + details only when ticket selected */}
        {selectedTicketId && (
          <>
            <ResizableHandle withHandle />

            {/* Center: Chat */}
            <ResizablePanel defaultSize={showDetails ? 52 : 78} minSize={35}>
              <TicketChatPanel
                ticketId={selectedTicketId}
                onBack={() => setSelectedTicketId(null)}
                showDetails={showDetails}
                onToggleDetails={() => setShowDetails(!showDetails)}
                isMobile={false}
              />
            </ResizablePanel>

            {/* Right: Details/AI - collapsible */}
            {showDetails && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={26} minSize={18} maxSize={40}>
                  <TicketDetailsPanel
                    ticketId={selectedTicketId}
                    onInsertReply={handleInsertReply}
                  />
                </ResizablePanel>
              </>
            )}
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default AdminSupportTickets;
