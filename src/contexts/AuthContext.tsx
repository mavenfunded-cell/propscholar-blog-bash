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
  const applyReferralCode = async (userId: string, userEmail: string) => {
    if (referralAppliedRef.current) return;
    
    const referralCode = localStorage.getItem('referral_code');
    if (!referralCode) return;
    
    referralAppliedRef.current = true;
    
    try {
      // Wait for user_coins record to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check if user_coins record exists
      const { data: existingCoins } = await supabase
        .from('user_coins')
        .select('id, referred_by, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Check if this is a new user (created within last 2 minutes)
      const isNewUser = !existingCoins || 
        (existingCoins.created_at && 
         new Date().getTime() - new Date(existingCoins.created_at).getTime() < 2 * 60 * 1000);
      
      // If not a new user, don't apply referral
      if (!isNewUser) {
        localStorage.removeItem('referral_code');
        return;
      }
      
      // If no record exists, create it first
      if (!existingCoins) {
        await supabase.from('user_coins').insert({
          user_id: userId,
          email: userEmail || ''
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (existingCoins.referred_by) {
        // Already referred, skip
        localStorage.removeItem('referral_code');
        return;
      }
      
      // Apply referral code only for new users
      const { data } = await supabase.rpc('apply_referral_code', { _referral_code: referralCode });
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
            // Apply referral code on sign in - will check if user is new
            if (event === 'SIGNED_IN') {
              applyReferralCode(session.user.id, session.user.email || '');
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
        // Try to apply referral on initial load - will check if user is new
        applyReferralCode(session.user.id, session.user.email || '');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
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
