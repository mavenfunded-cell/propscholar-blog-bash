import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ArrowLeft, Brain, Clock, Zap, AlertTriangle, RefreshCw, Settings, CreditCard, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { isAdminSubdomain, useAdminNavigation } from '@/hooks/useAdminSubdomain';

interface UsageLog {
  id: string;
  admin_id: string;
  ticket_id: string | null;
  request_type: string;
  tokens_estimated: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface RateLimitSettings {
  requests_per_hour: number;
  enabled: boolean;
}

const AdminAIUsage = () => {
  const { isLoggedIn, loading: authLoading } = useAdminAuth();
  const { adminNavigate, getDashboardPath } = useAdminNavigation();
  const queryClient = useQueryClient();
  const [rateLimitSettings, setRateLimitSettings] = useState<RateLimitSettings>({
    requests_per_hour: 10,
    enabled: true
  });

  // Fetch usage logs
  const { data: usageLogs, isLoading } = useQuery({
    queryKey: ['ai-usage-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as UsageLog[];
    }
  });

  // Fetch rate limit settings
  const { data: settings } = useQuery({
    queryKey: ['ai-rate-limit-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reward_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_rate_limit')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      const settingValue = data?.setting_value as Record<string, unknown> | null;
      if (!settingValue) return null;
      return {
        requests_per_hour: (settingValue.requests_per_hour as number) || 10,
        enabled: settingValue.enabled !== false
      } as RateLimitSettings;
    }
  });

  useEffect(() => {
    if (settings) {
      setRateLimitSettings(settings);
    }
  }, [settings]);

  // Calculate current hour usage
  const { data: currentHourUsage } = useQuery({
    queryKey: ['current-hour-usage'],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);
      if (error) throw error;
      return { count: count || 0 };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: RateLimitSettings) => {
      // First check if setting exists
      const { data: existing } = await supabase
        .from('reward_settings')
        .select('id')
        .eq('setting_key', 'ai_rate_limit')
        .single();

      const settingValueJson = {
        requests_per_hour: newSettings.requests_per_hour,
        enabled: newSettings.enabled
      };

      if (existing) {
        const { error } = await supabase
          .from('reward_settings')
          .update({
            setting_value: settingValueJson
          })
          .eq('setting_key', 'ai_rate_limit');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reward_settings')
          .insert([{
            setting_key: 'ai_rate_limit',
            setting_value: settingValueJson
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-rate-limit-settings'] });
      toast.success('Rate limit settings updated');
    },
    onError: () => {
      toast.error('Failed to update settings');
    }
  });

  // Calculate stats
  const today = new Date();
  const todayLogs = usageLogs?.filter(log => 
    new Date(log.created_at) >= startOfDay(today)
  ) || [];
  const weekLogs = usageLogs?.filter(log => 
    new Date(log.created_at) >= subDays(today, 7)
  ) || [];

  const totalTokensToday = todayLogs.reduce((sum, log) => sum + log.tokens_estimated, 0);
  const totalTokensWeek = weekLogs.reduce((sum, log) => sum + log.tokens_estimated, 0);
  const successRate = usageLogs?.length 
    ? Math.round((usageLogs.filter(l => l.status === 'success').length / usageLogs.length) * 100) 
    : 100;

  const requestsRemaining = Math.max(0, rateLimitSettings.requests_per_hour - (currentHourUsage?.count || 0));

  // Prepare chart data (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const dayLogs = usageLogs?.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= startOfDay(date) && logDate <= endOfDay(date);
    }) || [];
    return {
      date: format(date, 'MMM dd'),
      requests: dayLogs.length,
      tokens: dayLogs.reduce((sum, log) => sum + log.tokens_estimated, 0)
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400">Success</Badge>;
      case 'rate_limited':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Rate Limited</Badge>;
      case 'credits_exhausted':
        return <Badge className="bg-red-500/20 text-red-400">Credits Exhausted</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => adminNavigate(getDashboardPath())}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">AI Usage Dashboard</h1>
            <p className="text-muted-foreground">Monitor AI suggestion usage and manage rate limits</p>
          </div>
        </div>

        {/* Lovable Credits Info Card */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              Lovable AI Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                AI credits are managed by Lovable and cannot be accessed directly from this app. 
                To check your remaining credits, go to <strong>Settings → Workspace → Usage</strong> in the Lovable dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://lovable.dev/projects" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-400 hover:underline"
              >
                Open Lovable Dashboard <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://docs.lovable.dev/features/ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
              >
                Learn about AI Credits <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> If you see a "Credits Exhausted" error in the logs below, add credits at Settings → Workspace → Usage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Requests Remaining
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {requestsRemaining}/{rateLimitSettings.requests_per_hour}
              </div>
              <p className="text-xs text-muted-foreground">This hour (local limit)</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-400" />
                Today's Requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{todayLogs.length}</div>
              <p className="text-xs text-muted-foreground">~{totalTokensToday.toLocaleString()} tokens</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                This Week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{weekLogs.length}</div>
              <p className="text-xs text-muted-foreground">~{totalTokensWeek.toLocaleString()} tokens</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Success Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{successRate}%</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Rate Limit Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Rate Limit Settings
            </CardTitle>
            <CardDescription>Configure AI request limits per hour</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label htmlFor="requests-per-hour">Requests per hour</Label>
              <Input
                id="requests-per-hour"
                type="number"
                min={1}
                max={100}
                value={rateLimitSettings.requests_per_hour}
                onChange={(e) => setRateLimitSettings(prev => ({
                  ...prev,
                  requests_per_hour: parseInt(e.target.value) || 10
                }))}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="rate-limit-enabled"
                checked={rateLimitSettings.enabled}
                onCheckedChange={(checked) => setRateLimitSettings(prev => ({
                  ...prev,
                  enabled: checked
                }))}
              />
              <Label htmlFor="rate-limit-enabled">Enable rate limiting</Label>
            </div>
            <Button 
              onClick={() => updateSettingsMutation.mutate(rateLimitSettings)}
              disabled={updateSettingsMutation.isPending}
            >
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Over Time (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent AI Requests</CardTitle>
              <CardDescription>Last 100 AI suggestion requests</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['ai-usage-logs'] })}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : usageLogs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No AI requests yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tokens (est.)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.request_type}</TableCell>
                      <TableCell>{log.tokens_estimated.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-red-400 text-sm max-w-xs truncate">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAIUsage;
