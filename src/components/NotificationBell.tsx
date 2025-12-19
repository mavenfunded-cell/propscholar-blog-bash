import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Check, 
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
  AlertCircle
} from 'lucide-react';
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
    // Only allow removal if read and not persistent
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
        return <Coins className="w-4 h-4" />;
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
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden bg-background border border-border rounded-xl shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {hasUnreadRegular && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : totalItems === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Task Notifications (Persistent - Always on top) */}
                {taskNotifications.map((task, index) => (
                  <div
                    key={`task-${task.task_type}-${index}`}
                    className="w-full text-left px-4 py-3 bg-primary/5 border-l-2 border-primary"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                        {getTaskIcon(task.task_type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {task.title}
                          </p>
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded">
                            +{task.coins}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {task.message}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleTaskClick(task)}
                          className="mt-2 h-7 px-3 text-xs"
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
                  <div
                    key={notification.id}
                    className={`relative w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors group ${
                      !notification.is_read ? 'bg-muted/20' : ''
                    } ${notification.type === 'admin' ? 'border-l-2 border-primary bg-primary/5' : ''}`}
                  >
                    {/* Remove button - only show for read, non-persistent notifications */}
                    {notification.is_read && !notification.is_persistent && (
                      <button
                        onClick={(e) => handleRemoveNotification(e, notification)}
                        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                        aria-label="Remove notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full text-left"
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full ${
                          notification.type === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${
                              !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 line-clamp-2 ${
                            !notification.is_read ? 'text-muted-foreground' : 'text-muted-foreground/70'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground/50">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {notification.action_url && (
                              <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                            )}
                            {notification.cta_text && notification.action_url && (
                              <span className="text-[10px] text-primary font-medium">
                                {notification.cta_text}
                              </span>
                            )}
                            {notification.is_persistent && (
                              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" />
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
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground/60 text-center">
                {taskNotifications.length > 0 && (
                  <span className="text-primary/80">{taskNotifications.length} pending task{taskNotifications.length !== 1 ? 's' : ''} · </span>
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