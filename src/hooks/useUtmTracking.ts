import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const UTM_SESSION_KEY = 'ps_utm_session_id';
const UTM_DATA_KEY = 'ps_utm_data';
const COOKIE_EXPIRY_DAYS = 30;

interface UtmData {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

function generateSessionId(): string {
  return `utm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let c of ca) {
    c = c.trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

function getUtmParams(): UtmData {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || 'direct',
    utm_medium: params.get('utm_medium') || 'none',
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
    utm_term: params.get('utm_term') || null,
  };
}

function getStoredSessionId(): string | null {
  // Try cookie first, then localStorage
  return getCookie(UTM_SESSION_KEY) || localStorage.getItem(UTM_SESSION_KEY);
}

function getStoredUtmData(): UtmData | null {
  const cookieData = getCookie(UTM_DATA_KEY);
  if (cookieData) {
    try {
      return JSON.parse(cookieData);
    } catch {
      // ignore
    }
  }
  
  const localData = localStorage.getItem(UTM_DATA_KEY);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch {
      // ignore
    }
  }
  
  return null;
}

function storeSession(sessionId: string, utmData: UtmData) {
  // Store in both cookie and localStorage for redundancy
  setCookie(UTM_SESSION_KEY, sessionId, COOKIE_EXPIRY_DAYS);
  setCookie(UTM_DATA_KEY, JSON.stringify(utmData), COOKIE_EXPIRY_DAYS);
  localStorage.setItem(UTM_SESSION_KEY, sessionId);
  localStorage.setItem(UTM_DATA_KEY, JSON.stringify(utmData));
}

export function useUtmTracking() {
  const { user } = useAuth();
  const isInitializedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      let sessionId = getStoredSessionId();
      let utmData = getStoredUtmData();
      const currentUtmParams = getUtmParams();
      const isNewVisitor = !sessionId;

      // If new visitor, create new session
      if (isNewVisitor) {
        sessionId = generateSessionId();
        utmData = currentUtmParams;
        storeSession(sessionId, utmData);
      }

      sessionIdRef.current = sessionId;

      try {
        // Check if session exists in DB
        const { data: existingSession } = await supabase
          .from('utm_sessions')
          .select('id')
          .eq('session_id', sessionId!)
          .maybeSingle();

        if (!existingSession) {
          // Insert new session
          await supabase.from('utm_sessions').insert({
            session_id: sessionId!,
            utm_source: utmData?.utm_source || 'direct',
            utm_medium: utmData?.utm_medium || 'none',
            utm_campaign: utmData?.utm_campaign,
            utm_content: utmData?.utm_content,
            utm_term: utmData?.utm_term,
            landing_page: window.location.href,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            user_id: user?.id || null,
          });
        } else {
          // Update last seen
          await supabase
            .from('utm_sessions')
            .update({
              last_seen_at: new Date().toISOString(),
              user_id: user?.id || null,
            })
            .eq('session_id', sessionId!);
        }
      } catch (err) {
        console.error('UTM session error:', err);
      }
    };

    initSession();
  }, []);

  // Bind user when they log in or sign up
  useEffect(() => {
    const bindUserToSession = async () => {
      if (!user?.id || !sessionIdRef.current) return;

      const sessionId = sessionIdRef.current;
      const utmData = getStoredUtmData();

      try {
        // Update session with user_id
        await supabase
          .from('utm_sessions')
          .update({ user_id: user.id })
          .eq('session_id', sessionId);

        // Check if user_source exists
        const { data: existingSource } = await supabase
          .from('user_sources')
          .select('id, first_session_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingSource) {
          // Create new user source (first time)
          await supabase.from('user_sources').insert({
            user_id: user.id,
            email: user.email,
            first_session_id: sessionId,
            last_session_id: sessionId,
            first_utm_source: utmData?.utm_source || 'direct',
            first_utm_medium: utmData?.utm_medium || 'none',
            first_utm_campaign: utmData?.utm_campaign,
            last_utm_source: utmData?.utm_source || 'direct',
            last_utm_medium: utmData?.utm_medium || 'none',
            last_utm_campaign: utmData?.utm_campaign,
          });
        } else {
          // Update last session only (never overwrite first)
          await supabase
            .from('user_sources')
            .update({
              last_session_id: sessionId,
              last_utm_source: utmData?.utm_source || 'direct',
              last_utm_medium: utmData?.utm_medium || 'none',
              last_utm_campaign: utmData?.utm_campaign,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error('User binding error:', err);
      }
    };

    bindUserToSession();
  }, [user?.id]);

  return sessionIdRef.current;
}
