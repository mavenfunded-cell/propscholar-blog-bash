import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  ArrowRight, 
  X,
  Coins,
  Gift,
  Trophy,
  Users,
  Megaphone,
  CheckCircle,
  Instagram,
  Youtube,
  Twitter,
  Send,
  Share2,
  ListTodo,
  Pin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification, TaskNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useCoinSound } from '@/hooks/useCoinSound';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { playClick } = useCoinSound();
  
  const {
    notifications,
    taskNotifications,
    unreadCount,
    isLoading,
    hasFetched,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification
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

  const handleRemoveNotification = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (notification.is_read && !notification.is_persistent) {
      await removeNotification(notification.id);
    }
  };

  const handleTaskClick = (task: TaskNotification) => {
    setIsOpen(false);
    navigate(task.action_url);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'coins_earned':
      case 'coins_spent':
        return <Coins className="w-4 h-4" />;
      case 'reward_claimed':
        return <Gift className="w-4 h-4" />;
      case 'social_verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'winner_selected':
      case 'reel_winner_selected':
        return <Trophy className="w-4 h-4" />;
      case 'referral_reward':
        return <Users className="w-4 h-4" />;
      case 'announcement':
      case 'admin':
        return <Megaphone className="w-4 h-4" />;
      case 'task':
        return <ListTodo className="w-4 h-4" />;
      case 'referral':
        return <Share2 className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTaskIcon = (taskType: string) => {
    if (taskType.startsWith('social_')) {
      const platform = taskType.replace('social_', '');
      switch (platform) {
        case 'instagram': return <Instagram className="w-4 h-4" />;
        case 'youtube': return <Youtube className="w-4 h-4" />;
        case 'twitter': return <Twitter className="w-4 h-4" />;
        case 'telegram': return <Send className="w-4 h-4" />;
        default: return <Share2 className="w-4 h-4" />;
      }
    }
    if (taskType === 'referral') return <Users className="w-4 h-4" />;
    return <ListTodo className="w-4 h-4" />;
  };

  const hasUnreadRegular = notifications.some(n => !n.is_read);
  const totalItems = taskNotifications.length + notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          playClick();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-medium bg-white text-black rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-sm font-medium text-white/80">Notifications</h3>
            {hasUnreadRegular && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[50vh] custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : totalItems === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Bell className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-sm text-white/40 font-light">No notifications yet</p>
                <p className="text-xs text-white/25 mt-1 font-light">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {/* Task Notifications (Persistent - Always on top) */}
                {taskNotifications.map((task, index) => (
                  <div
                    key={`task-${task.task_type}-${index}`}
                    className="w-full text-left px-4 py-4 bg-white/[0.02] border-l-2 border-white/20"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] text-white/60">
                        {getTaskIcon(task.task_type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white/80">
                            {task.title}
                          </p>
                          <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium text-white/60 bg-white/[0.06] rounded">
                            +{task.coins}
                          </span>
                        </div>
                        <p className="text-xs mt-1 text-white/40 font-light">
                          {task.message}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleTaskClick(task)}
                          className="mt-3 h-7 px-4 text-xs bg-white/10 hover:bg-white/15 text-white/80 border-0"
                        >
                          {task.cta_text}
                          <ArrowRight className="w-3 h-3 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Regular Notifications */}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative w-full text-left px-4 py-3.5 hover:bg-white/[0.02] transition-colors group ${
                      !notification.is_read ? 'bg-white/[0.01]' : ''
                    } ${notification.type === 'admin' ? 'border-l-2 border-white/20' : ''}`}
                  >
                    {/* Remove button */}
                    {notification.is_read && !notification.is_persistent && (
                      <button
                        onClick={(e) => handleRemoveNotification(e, notification)}
                        className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                        aria-label="Remove notification"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full text-left"
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
                          notification.type === 'admin' ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.04] text-white/40'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm truncate ${
                              !notification.is_read ? 'font-medium text-white/80' : 'font-normal text-white/50'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-white/60" />
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 line-clamp-2 font-light ${
                            !notification.is_read ? 'text-white/40' : 'text-white/30'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-white/25 font-light">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.action_url && (
                              <ExternalLink className="w-2.5 h-2.5 text-white/20" />
                            )}
                            {notification.cta_text && notification.action_url && (
                              <span className="text-[10px] text-white/40 font-medium">
                                {notification.cta_text}
                              </span>
                            )}
                            {notification.is_persistent && (
                              <span className="text-[10px] text-white/25 flex items-center gap-0.5 font-light">
                                <Pin className="w-2.5 h-2.5" />
                                Pinned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {totalItems > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.01]">
              <p className="text-[10px] text-white/25 text-center font-light">
                {taskNotifications.length > 0 && (
                  <span className="text-white/40">{taskNotifications.length} pending task{taskNotifications.length !== 1 ? 's' : ''} · </span>
                )}
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}