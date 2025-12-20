import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Headset } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminTicketNotification() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Only subscribe if user is admin
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
          
          const ticket = payload.new as {
            id: string;
            ticket_number: number;
            subject: string;
            user_email: string;
          };

          // Show beautiful toast notification
          toast.custom(
            (t) => (
              <div 
                className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-5 rounded-2xl shadow-2xl border border-white/20 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] min-w-[320px]"
                onClick={() => {
                  toast.dismiss(t);
                  navigate(`/admin/tickets/${ticket.id}`);
                }}
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-transparent to-cyan-500/20 animate-pulse" />
                
                {/* Sparkle effects */}
                <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />
                <div className="absolute bottom-4 left-8 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                
                <div className="relative flex items-start gap-4">
                  {/* Icon container with pulse */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
                    <div className="relative bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/30">
                      <Headset className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-yellow-300 animate-pulse">
                        🎧 LIVE
                      </span>
                      <span className="text-xs text-white/70">
                        Ticket #{ticket.ticket_number}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-1 truncate">
                      New Support Ticket
                    </h3>
                    
                    <p className="text-sm text-white/80 truncate">
                      {ticket.subject}
                    </p>
                    
                    <p className="text-xs text-white/60 mt-1 truncate">
                      From: {ticket.user_email}
                    </p>
                    
                    <p className="text-xs text-white/50 mt-2 italic">
                      Click to view →
                    </p>
                  </div>
                </div>
              </div>
            ),
            {
              duration: 10000,
              position: 'top-right',
            }
          );
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
  }, [isAdmin, user, navigate]);

  // This component doesn't render anything visible
  return null;
}
