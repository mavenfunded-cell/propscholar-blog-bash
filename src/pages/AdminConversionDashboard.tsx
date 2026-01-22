import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminLink } from '@/components/AdminLink';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { TrackerSetupGuide } from '@/components/admin/TrackerSetupGuide';
import { 
  ArrowLeft, 
  RefreshCw, 
  ShoppingCart, 
  TrendingDown, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  MousePointer,
  Zap,
  Settings,
  Play,
  Code,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  today_abandoned: number;
  today_sessions: number;
  today_conversions: number;
  pending_carts: number;
  emails_sent_today: number;
  recovered_today: number;
  avg_cart_value: number;
}

interface DropoffAnalysis {
  by_page: Array<{ page_url: string; drop_count: number }> | null;
  by_reason: Array<{ drop_off_reason: string; count: number }> | null;
  by_product: Array<{ product_name: string; account_size: string; abandon_count: number }> | null;
}

interface AbandonedCart {
  id: string;
  user_email: string | null;
  cart_value: number;
  cart_items: Array<{ product_name: string; account_size?: string; price: number }>;
  checkout_started: boolean;
  abandoned_at: string;
  emails_sent: number;
  drop_off_reason: string;
  recovery_status: string;
  recovered: boolean;
}

interface ConversionInsight {
  id: string;
  insight_type: string;
  insight_text: string;
  severity: string;
  metric_value: number | null;
  metric_label: string | null;
  generated_at: string;
}

interface ConversionSetting {
  setting_key: string;
  setting_value: boolean | number | string;
}

const REASON_LABELS: Record<string, string> = {
  price_hesitation: "💰 Price hesitation",
  trust_concern: "🔒 Trust/clarity concern",
  payment_friction: "💳 Payment friction",
  decision_hesitation: "🤔 Decision hesitation",
  distraction: "🎯 Distraction/left quickly",
  unknown: "❓ Unknown reason"
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/30 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400"
};

export default function AdminConversionDashboard() {
  const navigate = useNavigate();
  const { getDashboardPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading } = useAdminAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dropoffs, setDropoffs] = useState<DropoffAnalysis | null>(null);
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [insights, setInsights] = useState<ConversionInsight[]>([]);
  const [settings, setSettings] = useState<ConversionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingEmails, setProcessingEmails] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      fetchData();
    }
  }, [authLoading, isLoggedIn]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [statsRes, dropoffsRes, cartsRes, insightsRes, settingsRes] = await Promise.all([
        supabase.rpc('get_conversion_dashboard_stats'),
        supabase.rpc('get_dropoff_analysis'),
        supabase.rpc('get_all_abandoned_carts'),
        supabase.rpc('get_all_conversion_insights'),
        supabase.rpc('get_conversion_settings')
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (dropoffsRes.data) setDropoffs(dropoffsRes.data as unknown as DropoffAnalysis);
      if (cartsRes.data) setCarts(cartsRes.data as unknown as AbandonedCart[]);
      if (insightsRes.data) setInsights(insightsRes.data as unknown as ConversionInsight[]);
      if (settingsRes.data) setSettings(settingsRes.data as unknown as ConversionSetting[]);
    } catch (error) {
      console.error('Error fetching conversion data:', error);
      toast.error('Failed to load conversion data');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-conversion-dropoffs');
      if (error) throw error;
      toast.success('Analysis complete! Refreshing insights...');
      await fetchData();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to run analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const processAbandonedCarts = async () => {
    setProcessingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-abandoned-carts');
      if (error) throw error;
      toast.success(`Processed! ${data?.emails_sent || 0} emails sent.`);
      await fetchData();
    } catch (error) {
      console.error('Email processing error:', error);
      toast.error('Failed to process abandoned carts');
    } finally {
      setProcessingEmails(false);
    }
  };

  const toggleEmailsEnabled = async () => {
    const currentValue = settings.find(s => s.setting_key === 'emails_enabled')?.setting_value;
    const newValue = currentValue === true || currentValue === 'true' ? false : true;
    
    try {
      await supabase.rpc('update_conversion_setting', { 
        _key: 'emails_enabled', 
        _value: newValue 
      });
      setSettings(settings.map(s => 
        s.setting_key === 'emails_enabled' ? { ...s, setting_value: newValue } : s
      ));
      toast.success(newValue ? 'Recovery emails enabled' : 'Recovery emails disabled');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const emailsEnabled = settings.find(s => s.setting_key === 'emails_enabled')?.setting_value;
  const isEmailsOn = emailsEnabled === true || emailsEnabled === 'true';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const conversionRate = stats && stats.today_sessions > 0 
    ? ((stats.today_conversions / stats.today_sessions) * 100).toFixed(1) 
    : '0';

  const recoveryRate = stats && stats.today_abandoned > 0 
    ? ((stats.recovered_today / stats.today_abandoned) * 100).toFixed(1) 
    : '0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AdminLink to="/admin/dashboard">
              <Button variant="ghost" size="sm" className="rounded-lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </AdminLink>
            <div>
              <h1 className="text-xl font-semibold">Conversion Intelligence</h1>
              <p className="text-sm text-muted-foreground">Understand why users don't convert</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Recovery Emails</span>
              <Switch 
                checked={isEmailsOn} 
                onCheckedChange={toggleEmailsEnabled}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              className="rounded-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => document.getElementById('tracker-setup')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-lg"
            >
              <Code className="w-4 h-4 mr-2" />
              Tracker Code
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Key Metrics - Plain Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="w-4 h-4 text-red-400" />
                    Abandoned Today
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold tabular-nums">{stats?.today_abandoned || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.pending_carts || 0} pending recovery
                  </p>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Recovered Today
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold tabular-nums">{stats?.recovered_today || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recoveryRate}% recovery rate
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-blue-400" />
                    Emails Sent Today
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold tabular-nums">{stats?.emails_sent_today || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recovery emails
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Avg Cart Value
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold tabular-nums">
                    ${stats?.avg_cart_value?.toFixed(0) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Today's abandoned carts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights - Plain Text */}
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-violet-400" />
                      AI Insights
                    </CardTitle>
                    <CardDescription className="mt-1">
                      What's happening with your conversions
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="rounded-lg"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Refresh Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No insights yet. Click "Refresh Analysis" to generate.</p>
                  </div>
                ) : (
                  insights.map((insight) => (
                    <div 
                      key={insight.id}
                      className={`p-4 rounded-lg border ${SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info}`}
                    >
                      <p className="text-sm font-medium">{insight.insight_text}</p>
                      {insight.metric_value !== null && (
                        <p className="text-xs opacity-70 mt-1">
                          {insight.metric_value.toFixed(1)} {insight.metric_label}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Drop-off Summary - Plain Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Friction Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    Why Users Drop Off
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dropoffs?.by_reason && dropoffs.by_reason.length > 0 ? (
                    dropoffs.by_reason.map((reason, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm">
                          {REASON_LABELS[reason.drop_off_reason] || reason.drop_off_reason}
                        </span>
                        <Badge variant="secondary" className="rounded-full">
                          {reason.count} carts
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No drop-off data yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Most Abandoned Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="w-5 h-5 text-amber-400" />
                    Most Abandoned Products
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dropoffs?.by_product && dropoffs.by_product.length > 0 ? (
                    dropoffs.by_product.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{product.product_name}</p>
                          {product.account_size && (
                            <p className="text-xs text-muted-foreground">{product.account_size}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="rounded-full text-amber-400 border-amber-500/30">
                          {product.abandon_count} abandoned
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No product data yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Abandoned Carts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Recent Abandoned Carts
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Users who left without purchasing
                    </CardDescription>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={processAbandonedCarts}
                    disabled={processingEmails || !isEmailsOn}
                    className="rounded-lg"
                  >
                    {processingEmails ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Recovery Emails
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {carts.slice(0, 10).map((cart) => (
                    <div 
                      key={cart.id} 
                      className={`p-4 rounded-lg border ${
                        cart.recovered 
                          ? 'border-emerald-500/30 bg-emerald-500/5' 
                          : 'border-border/50 bg-muted/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {cart.user_email ? (
                              <span className="text-sm font-medium truncate">{cart.user_email}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Anonymous user</span>
                            )}
                            {cart.recovered && (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 rounded-full text-xs">
                                Recovered
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>${cart.cart_value?.toFixed(2) || 0}</span>
                            <span>•</span>
                            <span>{cart.cart_items?.length || 0} items</span>
                            <span>•</span>
                            <span>{REASON_LABELS[cart.drop_off_reason] || cart.drop_off_reason}</span>
                          </div>
                          {cart.cart_items && cart.cart_items.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {cart.cart_items.map(i => i.product_name).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {cart.abandoned_at 
                              ? formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true })
                              : 'Unknown'
                            }
                          </p>
                          {cart.emails_sent > 0 && (
                            <p className="text-xs text-blue-400 mt-1">
                              {cart.emails_sent} email{cart.emails_sent > 1 ? 's' : ''} sent
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {carts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No abandoned carts recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Summary */}
            <Card className="border-border/50 bg-muted/20">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <p className="text-lg">
                    <span className="font-semibold">{stats?.today_abandoned || 0}</span> users abandoned checkout today.
                  </p>
                  {dropoffs?.by_reason && dropoffs.by_reason.length > 0 && (
                    <p className="text-muted-foreground">
                      Most common issue: <span className="font-medium text-foreground">
                        {REASON_LABELS[dropoffs.by_reason[0].drop_off_reason] || dropoffs.by_reason[0].drop_off_reason}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {conversionRate}% of visitors converted • ${stats?.avg_cart_value?.toFixed(0) || 0} average cart value
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tracker Setup Guide */}
            <div id="tracker-setup">
              <TrackerSetupGuide />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
