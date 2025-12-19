import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification, TaskNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const {
    notifications,
    taskNotifications,
    unreadCount,
    isLoading,
    hasFetched,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && !hasFetched) {
      fetchNotifications();
    }
  }, [isOpen, hasFetched, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  const handleTaskClick = (task: TaskNotification) => {
    setIsOpen(false);
    navigate(task.action_url);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'coins_earned':
        return '🪙';
      case 'coins_spent':
        return '💸';
      case 'reward_claimed':
        return '🎁';
      case 'social_verified':
        return '✅';
      case 'winner_selected':
      case 'reel_winner_selected':
        return '🏆';
      case 'referral_reward':
        return '👥';
      case 'announcement':
      case 'admin':
        return '📢';
      case 'task':
        return '📱';
      case 'referral':
        return '👥';
      default:
        return '🔔';
    }
  };

  const getTaskIcon = (taskType: string) => {
    if (taskType.startsWith('social_')) {
      const platform = taskType.replace('social_', '');
      switch (platform) {
        case 'instagram': return '📸';
        case 'youtube': return '📺';
        case 'twitter': return '🐦';
        case 'telegram': return '✈️';
        default: return '📱';
      }
    }
    if (taskType === 'referral') return '👥';
    return '📋';
  };

  const hasUnreadRegular = notifications.some(n => !n.is_read);
  const totalItems = taskNotifications.length + notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {hasUnreadRegular && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[50vh] custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : totalItems === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No notifications yet</p>
                <p className="text-xs text-white/25 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {/* Task Notifications (Persistent - Always on top) */}
                {taskNotifications.map((task, index) => (
                  <div
                    key={`task-${task.task_type}-${index}`}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-amber-500"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-amber-500/20 text-lg">
                        {getTaskIcon(task.task_type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white">
                            {task.title}
                          </p>
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/20 rounded">
                            +{task.coins} 🪙
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 text-white/60">
                          {task.message}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleTaskClick(task)}
                          className="mt-2 h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-black font-medium"
                        >
                          {task.cta_text}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Regular Notifications */}
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors group ${
                      !notification.is_read ? 'bg-white/[0.02]' : ''
                    } ${notification.type === 'admin' ? 'border-l-2 border-blue-500 bg-blue-500/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-lg ${
                        notification.type === 'admin' ? 'bg-blue-500/20' : 'bg-white/5'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${
                            !notification.is_read ? 'text-white' : 'text-white/70'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${
                          !notification.is_read ? 'text-white/60' : 'text-white/40'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-white/30">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {notification.action_url && (
                            <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                          )}
                          {notification.cta_text && notification.action_url && (
                            <span className="text-[10px] text-blue-400 font-medium">
                              {notification.cta_text} →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {totalItems > 0 && (
            <div className="px-4 py-2.5 border-t border-white/10 bg-white/[0.02]">
              <p className="text-[10px] text-white/30 text-center">
                {taskNotifications.length > 0 && (
                  <span className="text-amber-400/60">{taskNotifications.length} pending tasks • </span>
                )}
                {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
