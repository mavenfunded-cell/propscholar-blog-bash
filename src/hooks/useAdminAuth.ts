import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Storage keys
const ADMIN_SESSION_KEY = 'propscholar_admin_session';
const ADMIN_EMAIL_KEY = 'propscholar_admin_email';
const ADMIN_EXPIRES_KEY = 'propscholar_admin_expires';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    const sessionToken = localStorage.getItem(ADMIN_SESSION_KEY);
    const storedEmail = localStorage.getItem(ADMIN_EMAIL_KEY);
    const expiresAt = localStorage.getItem(ADMIN_EXPIRES_KEY);

    if (!sessionToken || !expiresAt) {
      setIsAdmin(false);
      setEmail(null);
      setLoading(false);
      return;
    }

    // Check if session is expired locally first
    if (new Date(expiresAt) < new Date()) {
      clearSession();
      setIsAdmin(false);
      setEmail(null);
      setLoading(false);
      return;
    }

    try {
      // Validate session with server
      const { data, error } = await supabase.functions.invoke('validate-admin-session', {
        body: { sessionToken },
      });

      if (error || !data?.valid) {
        clearSession();
        setIsAdmin(false);
        setEmail(null);
      } else {
        setIsAdmin(true);
        setEmail(storedEmail);
      }
    } catch (err) {
      console.error('Error validating session:', err);
      clearSession();
      setIsAdmin(false);
      setEmail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const clearSession = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
  };

  const signOut = async () => {
    const sessionToken = localStorage.getItem(ADMIN_SESSION_KEY);
    
    if (sessionToken) {
      try {
        await supabase.functions.invoke('logout-admin', {
          body: { sessionToken },
        });
      } catch (err) {
        console.error('Error logging out:', err);
      }
    }
    
    clearSession();
    setIsAdmin(false);
    setEmail(null);
  };

  // Get session token for API calls
  const getSessionToken = (): string | null => {
    return localStorage.getItem(ADMIN_SESSION_KEY);
  };

  return { 
    isAdmin, 
    loading, 
    email,
    signOut, 
    getSessionToken,
    isLoggedIn: isAdmin && !loading,
    refreshSession: checkSession,
  };
}
