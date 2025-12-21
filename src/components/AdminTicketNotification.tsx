import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Headset, ExternalLink, BellRing, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TicketNotification {
  id: string;
  ticket_number: number;
  subject: string;
  user_email: string;
  created_at: string;
}

// Brand name for notifications
const NOTIFICATION_BRAND = "Physics Lective Is Live";

export function AdminTicketNotification() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [notifications, setNotifications] = useState<TicketNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    // Check localStorage if we've already asked
    const asked = localStorage.getItem('notification-permission-asked');
    if (asked) setHasRequestedPermission(true);
  }, []);

  // Auto-request permission on first admin visit (once)
  useEffect(() => {
    if (isAdmin && user && !hasRequestedPermission && notificationPermission === 'default') {
      // Auto-request after 2 seconds
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, user, hasRequestedPermission, notificationPermission]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }

    try {
      localStorage.setItem('notification-permission-asked', 'true');
      setHasRequestedPermission(true);
      
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Notifications enabled!', {
          description: 'You will receive alerts for new support tickets.'
        });
        // Show a test notification
        const testNotification = new Notification(NOTIFICATION_BRAND, {
          body: '✅ Notifications are now enabled!',
          icon: '/favicon.ico',
          tag: 'test-notification',
          silent: true
        });
        setTimeout(() => testNotification.close(), 3000);
      } else if (permission === 'denied') {
        toast.error('Notifications blocked', {
          description: 'Enable in browser settings to receive ticket alerts.'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, []);

  // Show browser notification with better handling
  const showBrowserNotification = useCallback((ticket: TicketNotification) => {
    console.log('Showing notification for ticket:', ticket.ticket_number);
    
    // Try to play a beep sound (Web Audio API fallback)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not available');
    }

    // Show browser notification if permitted
    if (notificationPermission === 'granted') {
      try {
        const notification = new Notification(NOTIFICATION_BRAND, {
          body: `🎫 New Ticket #${ticket.ticket_number}\n${ticket.subject}`,
          icon: '/favicon.ico',
          tag: `ticket-${ticket.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        } as NotificationOptions);

        notification.onclick = () => {
          window.focus();
          navigate(`/admin/tickets/${ticket.id}`);
          notification.close();
        };

        // Auto close after 15 seconds
        setTimeout(() => notification.close(), 15000);
      } catch (e) {
        console.error('Failed to show notification:', e);
      }
    }
  }, [notificationPermission, navigate]);

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
          
          // Show browser notification
          showBrowserNotification(ticket);
          
          // Auto-open panel on new ticket
          setIsOpen(true);
          
          // Also show a toast
          toast.info(`New Ticket #${ticket.ticket_number}`, {
            description: ticket.subject,
            action: {
              label: 'View',
              onClick: () => navigate(`/admin/tickets/${ticket.id}`)
            }
          });
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
  }, [isAdmin, user, showBrowserNotification, navigate]);

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
              <h2 className="font-semibold text-lg">{NOTIFICATION_BRAND}</h2>
              <p className="text-xs text-muted-foreground">Support Tickets • Live</p>
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

        {/* Notification Permission Banner */}
        {notificationPermission !== 'granted' && (
          <div className="p-4 bg-gradient-to-r from-primary/20 to-violet-600/20 border-b border-border">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-sm font-medium">Enable Notifications</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Get instant alerts when new support tickets arrive
              </p>
              <Button 
                size="sm" 
                variant="default"
                onClick={requestNotificationPermission}
                className="w-full mt-1"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Allow Notifications
              </Button>
            </div>
          </div>
        )}

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
