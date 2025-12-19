import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'ps_session_id';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function useSessionTracking() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const startTimeRef = useRef<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    
    const initSession = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        // Check if session exists
        const { data: existing } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('session_id', sessionId)
          .single();

        if (!existing) {
          // Create new session
          await supabase.from('user_sessions').insert({
            session_id: sessionId,
            user_id: user?.id || null,
            user_agent: navigator.userAgent,
            page_views: 1,
            total_seconds: 0,
          });
        } else {
          // Increment page views
          await supabase
            .from('user_sessions')
            .update({
              page_views: (existing as any).page_views + 1,
              last_active_at: new Date().toISOString(),
              user_id: user?.id || null,
            })
            .eq('session_id', sessionId);
        }
      } catch (err) {
        console.error('Session init error:', err);
      }
    };

    const sendHeartbeat = async () => {
      const now = Date.now();
      const secondsSinceLastHeartbeat = Math.round((now - lastHeartbeatRef.current) / 1000);
      lastHeartbeatRef.current = now;

      try {
        await supabase
          .from('user_sessions')
          .update({
            last_active_at: new Date().toISOString(),
            total_seconds: Math.round((now - startTimeRef.current) / 1000),
            user_id: user?.id || null,
          })
          .eq('session_id', sessionId);
      } catch (err) {
        // Silent fail
      }
    };

    initSession();

    // Heartbeat interval
    const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    // Send heartbeat before leaving
    const handleBeforeUnload = () => {
      const now = Date.now();
      const totalSeconds = Math.round((now - startTimeRef.current) / 1000);
      
      // Use sendBeacon for reliable delivery
      const data = JSON.stringify({
        session_id: sessionId,
        total_seconds: totalSeconds,
        last_active_at: new Date().toISOString(),
      });
      
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?session_id=eq.${sessionId}`,
        data
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendHeartbeat();
    };
  }, [user?.id]);

  return sessionIdRef.current;
}
