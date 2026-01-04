import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Lock, Mail, ArrowLeft, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Storage keys
const ADMIN_SESSION_KEY = 'propscholar_admin_session';
const ADMIN_EMAIL_KEY = 'propscholar_admin_email';
const ADMIN_EXPIRES_KEY = 'propscholar_admin_expires';

// Input validation schema
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type LoginStep = 'email' | 'otp' | 'success';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<LoginStep>('email');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  // Check for existing valid session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const sessionToken = localStorage.getItem(ADMIN_SESSION_KEY);
    const expiresAt = localStorage.getItem(ADMIN_EXPIRES_KEY);

    if (!sessionToken || !expiresAt) {
      setCheckingSession(false);
      return;
    }

    // Check if session is expired locally first
    if (new Date(expiresAt) < new Date()) {
      clearSession();
      setCheckingSession(false);
      return;
    }

    try {
      // Validate session with server
      const { data, error } = await supabase.functions.invoke('validate-admin-session', {
        body: { sessionToken },
      });

      if (error || !data?.valid) {
        clearSession();
        setCheckingSession(false);
        return;
      }

      // Session is valid, redirect to dashboard
      navigateToDashboard();
    } catch (err) {
      console.error('Error validating session:', err);
      clearSession();
      setCheckingSession(false);
    }
  };

  const clearSession = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
  };

  const navigateToDashboard = () => {
    navigate(isAdminSubdomain() ? '/dashboard' : '/admin/dashboard', { replace: true });
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      toast.error('Validation error', {
        description: validation.error.errors[0].message
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-admin-otp', {
        body: { email: email.trim() },
      });

      if (error) {
        toast.error('Failed to send OTP', {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error('Access Denied', {
          description: data.error === 'Unauthorized email address' 
            ? 'This email is not authorized for admin access.'
            : data.error,
        });
        setLoading(false);
        return;
      }

      toast.success('OTP Sent!', {
        description: 'Check your email for the 6-digit code.',
      });
      setStep('otp');
    } catch (err: any) {
      toast.error('Error', {
        description: 'Failed to send OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Invalid OTP', {
        description: 'Please enter the complete 6-digit code.'
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-otp', {
        body: { email: email.trim(), otp },
      });

      if (error) {
        toast.error('Verification failed', {
          description: error.message,
        });
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error('Invalid OTP', {
          description: data.error === 'Invalid or expired OTP'
            ? 'The OTP is incorrect or has expired. Please request a new one.'
            : data.error,
        });
        setOtp('');
        setLoading(false);
        return;
      }

      // Store session in localStorage
      localStorage.setItem(ADMIN_SESSION_KEY, data.sessionToken);
      localStorage.setItem(ADMIN_EMAIL_KEY, data.email);
      localStorage.setItem(ADMIN_EXPIRES_KEY, data.expiresAt);

      setStep('success');
      toast.success('Welcome back, Admin!');
      
      // Redirect after short delay to show success state
      setTimeout(() => {
        navigateToDashboard();
      }, 1000);
    } catch (err: any) {
      toast.error('Error', {
        description: 'Failed to verify OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-otp', {
        body: { email: email.trim() },
      });

      if (error || data?.error) {
        toast.error('Failed to resend OTP');
        return;
      }

      toast.success('New OTP sent!', {
        description: 'Check your email for the new code.',
      });
      setOtp('');
    } catch (err) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              {step === 'email' && 'Enter your admin email to receive an OTP'}
              {step === 'otp' && 'Enter the 6-digit code sent to your email'}
              {step === 'success' && 'Authentication successful!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="propscholars@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only authorized admin emails can access this panel.
                  </p>
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
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Send OTP
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    OTP sent to <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <Button 
                  onClick={handleVerifyOTP}
                  variant="gold" 
                  className="w-full"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Verify & Login
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setOtp('');
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-gold hover:text-gold/80 transition-colors"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">Redirecting to dashboard...</p>
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
