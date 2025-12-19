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
  is_persistent: boolean;
  cta_text: string | null;
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
      setTaskNotifications([]);
    }
  }, [user]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(taskNotifications.length);
        return;
      }

      // Include task notifications in unread count
      const taskCount = taskNotifications.length;
      setUnreadCount((count || 0) + taskCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setUnreadCount(taskNotifications.length);
    }
  }, [user, taskNotifications.length]);

  // Fetch notifications list (only when needed)
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setHasFetched(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // Fetch both regular notifications and task notifications
      const [{ data, error }] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        fetchTaskNotifications()
      ]);

      if (!error && data) {
        setNotifications(data as Notification[]);
      } else if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setHasFetched(true);
      setIsLoading(false);
    }
  }, [user, fetchTaskNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        _notification_id: notificationId
      });

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        console.error('Error marking notification as read:', error);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        // Keep task notifications count as they can't be dismissed
        setUnreadCount(taskNotifications.length);
      } else {
        console.error('Error marking all as read:', error);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [user, taskNotifications.length]);

  // Remove a notification (only for read, non-persistent notifications)
  const removeNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find(n => n.id === notificationId);
    
    // Prevent removal of unread or persistent notifications
    if (!notification || !notification.is_read || notification.is_persistent) {
      console.warn('Cannot remove unread or persistent notification');
      return;
    }

    // Optimistically remove from UI
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    try {
      // Delete from database
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .eq('is_read', true)
        .eq('is_persistent', false);

      if (error) {
        console.error('Error removing notification:', error);
        // Revert optimistic update on error
        setNotifications(prev => [...prev, notification].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    } catch (err) {
      console.error('Error removing notification:', err);
      // Revert optimistic update on error
      setNotifications(prev => [...prev, notification].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  }, [user, notifications]);

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

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setTaskNotifications([]);
      setUnreadCount(0);
      setHasFetched(false);
    }
  }, [user]);

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
          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
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
    removeNotification,
    refreshTaskNotifications
  };
}
