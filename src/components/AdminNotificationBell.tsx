import { useState } from 'react';
import { Bell, BellOff, BellRing, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { toast } from 'sonner';

export function AdminNotificationBell() {
  const {
    isEnabled,
    isSupported,
    isGranted,
    isDefault,
    newTicketsCount,
    enableNotifications,
    disableNotifications,
    clearNewTicketsCount,
  } = useAdminNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = async () => {
    if (isEnabled) {
      disableNotifications();
      toast.info('Notifications disabled');
    } else {
      const success = await enableNotifications();
      if (success) {
        toast.success('Notifications enabled! You\'ll be notified of new tickets.');
      } else {
        toast.error('Could not enable notifications. Please allow notifications in your browser settings.');
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && newTicketsCount > 0) {
      clearNewTicketsCount();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isEnabled ? (
            newTicketsCount > 0 ? (
              <BellRing className="h-5 w-5 text-primary animate-pulse" />
            ) : (
              <Bell className="h-5 w-5" />
            )
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {newTicketsCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {newTicketsCount > 9 ? '9+' : newTicketsCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Notification Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Desktop Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get notified when new tickets arrive
              </p>
            </div>
            <Switch 
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          </div>
          
          {isDefault && !isEnabled && (
            <p className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
              Click the toggle to enable browser notifications
            </p>
          )}
          
          {!isGranted && !isDefault && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}
        </div>

        {newTicketsCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-primary font-medium">
              <BellRing className="h-4 w-4 mr-2" />
              {newTicketsCount} new ticket{newTicketsCount > 1 ? 's' : ''} since last view
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
