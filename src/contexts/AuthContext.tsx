import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const referralAppliedRef = useRef(false);

  // Apply referral code after authentication - ONLY for new users
  const applyReferralCode = async (userId: string, userEmail: string, isNewSignup: boolean) => {
    if (referralAppliedRef.current) return;
    
    const referralCode = localStorage.getItem('referral_code');
    if (!referralCode) return;
    
    // Only apply referral for new signups, not existing user logins
    if (!isNewSignup) {
      console.log('Skipping referral - not a new signup');
      return;
    }
    
    referralAppliedRef.current = true;
    
    try {
      // Wait longer for user_coins record to be created by trigger
      let retries = 0;
      let existingCoins = null;
      
      while (retries < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data } = await supabase
          .from('user_coins')
          .select('id, referred_by, created_at')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (data) {
          existingCoins = data;
          break;
        }
        retries++;
      }
      
      // If still no record, create it
      if (!existingCoins) {
        console.log('Creating user_coins record for new user');
        await supabase.from('user_coins').insert({
          user_id: userId,
          email: userEmail || ''
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (existingCoins.referred_by) {
        // Already referred, skip
        console.log('User already has a referrer');
        localStorage.removeItem('referral_code');
        return;
      }
      
      // Apply referral code
      console.log('Applying referral code:', referralCode);
      const { data, error } = await supabase.rpc('apply_referral_code', { _referral_code: referralCode });
      
      if (error) {
        console.error('Referral RPC error:', error);
      }
      
      const result = data as any;
      
      if (result?.success) {
        toast.success(`Welcome! Your referrer received ${result.coins} coins.`);
      } else {
        console.log('Referral result:', result);
      }
    } catch (err) {
      console.error('Referral error:', err);
    } finally {
      localStorage.removeItem('referral_code');
    }
  };

  // Send welcome email for new users
  const sendWelcomeEmail = async (email: string, name?: string, provider?: string) => {
    try {
      console.log('Sending welcome email to:', email);
      await supabase.functions.invoke('send-welcome-email', {
        body: { email, name, provider }
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
            // Apply referral code only on new signup (not regular login)
            if (event === 'SIGNED_IN') {
              // Check if user was just created (within last 30 seconds)
              const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
              const isNewSignup = Date.now() - createdAt < 30000;
              
              if (isNewSignup) {
                // Send welcome email for new users
                const provider = session.user.app_metadata?.provider || 'email';
                const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
                sendWelcomeEmail(session.user.email || '', name, provider);
              }
              
              applyReferralCode(session.user.id, session.user.email || '', isNewSignup);
            }
          }, 0);
        } else {
          setIsAdmin(false);
          referralAppliedRef.current = false;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
        // On initial load, check if user was just created (within last 30 seconds)
        const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
        const isNewSignup = Date.now() - createdAt < 30000;
        applyReferralCode(session.user.id, session.user.email || '', isNewSignup);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      // Use backend role-check function (security definer) to avoid RLS blocking role lookup
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
