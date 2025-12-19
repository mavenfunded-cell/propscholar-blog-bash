import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  is_persistent?: boolean;
  cta_text?: string | null;
  created_at: string;
}

export interface TaskNotification {
  type: string;
  task_type: string;
  title: string;
  message: string;
  action_url: string;
  cta_text: string;
  coins: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<TaskNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { user } = useAuth();

  // Fetch task notifications (pending tasks)
  const fetchTaskNotifications = useCallback(async () => {
    if (!user) {
      setTaskNotifications([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_task_notifications', {
        _user_id: user.id
      });

      if (!error && data) {
        setTaskNotifications(data as unknown as TaskNotification[]);
      }
    } catch (err) {
      console.error('Error fetching task notifications:', err);
    }
  }, [user]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    // Include task notifications in unread count
    const taskCount = taskNotifications.length;
    setUnreadCount((count || 0) + taskCount);
  }, [user, taskNotifications.length]);

  // Fetch notifications list (only when needed)
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    
    // Fetch both regular notifications and task notifications
    const [{ data, error }, _] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      fetchTaskNotifications()
    ]);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setHasFetched(true);
    }
    setIsLoading(false);
  }, [user, fetchTaskNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase.rpc('mark_notification_read', {
      _notification_id: notificationId
    });

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase.rpc('mark_all_notifications_read');

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      // Keep task notifications count as they can't be dismissed
      setUnreadCount(taskNotifications.length);
    }
  }, [user, taskNotifications.length]);

  // Refresh task notifications (call after completing a task)
  const refreshTaskNotifications = useCallback(async () => {
    await fetchTaskNotifications();
  }, [fetchTaskNotifications]);

  // Fetch task notifications on mount and user change
  useEffect(() => {
    fetchTaskNotifications();
  }, [fetchTaskNotifications]);

  // Fetch unread count on mount and user change
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    taskNotifications,
    unreadCount,
    isLoading,
    hasFetched,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refreshTaskNotifications
  };
}
