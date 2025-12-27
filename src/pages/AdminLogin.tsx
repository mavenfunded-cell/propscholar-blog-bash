import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { z } from 'zod';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer admin role check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminAndRedirect(session.user.id);
          }, 0);
        } else {
          setCheckingAuth(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminAndRedirect(session.user.id);
      } else {
        setCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminAndRedirect = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!error && data) {
        // User is admin, redirect to dashboard
        navigate(isAdminSubdomain() ? '/dashboard' : '/admin/dashboard', { replace: true });
      } else {
        // Not an admin, sign them out
        await supabase.auth.signOut();
        toast.error('Access denied', {
          description: 'You do not have admin privileges.'
        });
      }
    } catch (err) {
      console.error('Error checking admin role:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error('Validation error', {
        description: firstError.message
      });
      return;
    }
    
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error('Login failed', {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast.error('Login failed', {
          description: 'Unable to authenticate. Please try again.',
        });
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        // Not an admin - sign them out
        await supabase.auth.signOut();
        toast.error('Access denied', {
          description: 'You do not have admin privileges.'
        });
        setLoading(false);
        return;
      }

      // Successfully authenticated as admin
      toast.success('Welcome back, Admin!');
      navigate(isAdminSubdomain() ? '/dashboard' : '/admin/dashboard');
    } catch (err: any) {
      toast.error('Login error', {
        description: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-blue-accent/5" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-accent/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative animate-scale-in">
        {!isAdminSubdomain() && (
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        )}
        
        <Card className="border-border/50 shadow-card">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <Logo showText={false} />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Enter your admin credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="gold" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
