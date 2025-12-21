import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrowserNotifications } from './useBrowserNotifications';

interface NewTicketPayload {
  ticket_number: number;
  subject: string;
  user_email: string;
  id: string;
}

export function useAdminNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const { permission, isSupported, requestPermission, showNotification, isGranted, isDefault } = useBrowserNotifications();

  // Check if admin has enabled notifications before
  useEffect(() => {
    const enabled = localStorage.getItem('admin_notifications_enabled') === 'true';
    setIsEnabled(enabled && isGranted);
  }, [isGranted]);

  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      console.warn('Browser notifications not supported');
      return false;
    }

    const granted = await requestPermission();
    if (granted) {
      localStorage.setItem('admin_notifications_enabled', 'true');
      setIsEnabled(true);
      return true;
    }
    return false;
  }, [isSupported, requestPermission]);

  const disableNotifications = useCallback(() => {
    localStorage.setItem('admin_notifications_enabled', 'false');
    setIsEnabled(false);
  }, []);

  // Subscribe to new tickets
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    if (!isLoggedIn) return;

    const channel = supabase
      .channel('admin-new-tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const ticket = payload.new as NewTicketPayload;
          console.log('New support ticket received:', ticket);
          
          setNewTicketsCount(prev => prev + 1);

          // Show browser notification if enabled
          if (isEnabled && isGranted) {
            showNotification(`New Ticket #${ticket.ticket_number}`, {
              body: `From: ${ticket.user_email}\n${ticket.subject}`,
              tag: `ticket-${ticket.id}`,
              requireInteraction: true,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isEnabled, isGranted, showNotification]);

  const clearNewTicketsCount = useCallback(() => {
    setNewTicketsCount(0);
  }, []);

  return {
    isEnabled,
    isSupported,
    isGranted,
    isDefault,
    permission,
    newTicketsCount,
    enableNotifications,
    disableNotifications,
    clearNewTicketsCount,
    showNotification,
  };
}
