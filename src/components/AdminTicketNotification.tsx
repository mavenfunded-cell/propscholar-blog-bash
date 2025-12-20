import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Headset, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TicketNotification {
  id: string;
  ticket_number: number;
  subject: string;
  user_email: string;
  created_at: string;
}

export function AdminTicketNotification() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAdmin || !user) {
      return;
    }

    console.log('Setting up admin ticket notification subscription');

    // Subscribe to new support tickets
    const channel = supabase
      .channel('admin-ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('New support ticket received:', payload);
          
          const ticket = payload.new as TicketNotification;

          // Add to notifications list
          setNotifications(prev => [ticket, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          
          // Auto-open panel on new ticket
          setIsOpen(true);
        }
      )
      .subscribe((status) => {
        console.log('Admin ticket notification subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up admin ticket notification subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [isAdmin, user]);

  const handleTicketClick = (ticketId: string) => {
    navigate(`/admin/tickets/${ticketId}`);
    setIsOpen(false);
  };

  const clearNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Don't render anything if not admin
  if (!isAdmin || !user) {
    return null;
  }

  return (
    <>
      {/* Notification Bell - Fixed Position */}
      <div className="fixed top-4 right-4 z-[60]">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative h-11 w-11 rounded-full border-2 bg-background/95 backdrop-blur-sm shadow-lg transition-all",
            unreadCount > 0 && "border-primary animate-pulse"
          )}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setUnreadCount(0);
          }}
        >
          <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-primary")} />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold animate-bounce"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[65] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-background border-l border-border shadow-2xl z-[70] transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-violet-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Headset className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Support Tickets</h2>
              <p className="text-xs text-muted-foreground">Live notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100%-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No new tickets</p>
              <p className="text-xs mt-1">New tickets will appear here</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className={cn(
                    "group relative p-4 rounded-xl cursor-pointer transition-all duration-200",
                    "bg-gradient-to-r from-violet-600/5 via-purple-600/5 to-indigo-600/5",
                    "hover:from-violet-600/15 hover:via-purple-600/15 hover:to-indigo-600/15",
                    "border border-border/50 hover:border-primary/30",
                    index === 0 && "animate-in slide-in-from-right duration-300"
                  )}
                  onClick={() => handleTicketClick(ticket.id)}
                >
                  {/* New indicator for first item */}
                  {index === 0 && notifications.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Headset className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                          #{ticket.ticket_number}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(ticket.created_at), 'HH:mm')}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-sm truncate mb-1">
                        {ticket.subject}
                      </h4>
                      
                      <p className="text-xs text-muted-foreground truncate">
                        {ticket.user_email}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => clearNotification(ticket.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[10px] text-primary/70">
                    <ExternalLink className="h-3 w-3" />
                    <span>Click to view ticket</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
