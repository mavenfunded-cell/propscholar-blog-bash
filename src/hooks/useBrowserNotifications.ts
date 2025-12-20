import { useState, useEffect, useCallback } from 'react';

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Browser notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot show notification - permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
  };
}
