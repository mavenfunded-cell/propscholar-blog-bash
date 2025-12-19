import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'ps_session_id';
const GEO_KEY = 'ps_session_geo_done';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

    const maybeGeoLocate = async () => {
      // Only do this once per session (cheap + avoids rate limits)
      if (sessionStorage.getItem(GEO_KEY) === 'true') return;
      sessionStorage.setItem(GEO_KEY, 'true');

      try {
        await supabase.functions.invoke('geo-session', {
          body: { session_id: sessionId },
        });
      } catch {
        // silent
      }
    };

    const initSession = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        const { data: existing } = await supabase
          .from('user_sessions')
          .select('id, page_views, country, city')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (!existing) {
          await supabase.from('user_sessions').insert({
            session_id: sessionId,
            user_id: user?.id || null,
            user_agent: navigator.userAgent,
            page_views: 1,
            total_seconds: 0,
          });
          await maybeGeoLocate();
        } else {
          await supabase
            .from('user_sessions')
            .update({
              page_views: (existing.page_views ?? 1) + 1,
              last_active_at: new Date().toISOString(),
              user_id: user?.id || null,
            })
            .eq('session_id', sessionId);

          if (!existing.country && !existing.city) {
            await maybeGeoLocate();
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
      }
    };

    const sendHeartbeat = async () => {
      const now = Date.now();
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
      } catch {
        // silent
      }
    };

    initSession();

    const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendHeartbeat();
    };
  }, [user?.id]);

  return sessionIdRef.current;
}

