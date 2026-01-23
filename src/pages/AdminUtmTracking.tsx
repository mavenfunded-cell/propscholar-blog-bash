import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  BarChart3,
  Download,
  Search,
  Calendar as CalendarIcon,
  Users,
  Globe,
  Target,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UtmSession {
  id: string;
  session_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
  user_id: string | null;
  created_at: string;
}

interface UserSource {
  id: string;
  user_id: string;
  email: string | null;
  first_session_id: string;
  first_utm_source: string | null;
  first_utm_campaign: string | null;
  last_utm_source: string | null;
  last_utm_campaign: string | null;
  created_at: string;
}

interface SourceStats {
  source: string;
  count: number;
}

interface CampaignStats {
  campaign: string;
  count: number;
}

export default function AdminUtmTracking() {
  const { isLoggedIn, loading: isLoading } = useAdminAuth();
  const [sessions, setSessions] = useState<UtmSession[]>([]);
  const [userSources, setUserSources] = useState<UserSource[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [totalSessions, setTotalSessions] = useState(0);
  const [directTraffic, setDirectTraffic] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('utm_sessions')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false })
        .limit(500);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
      setTotalSessions(sessionsData?.length || 0);
      setDirectTraffic(sessionsData?.filter(s => s.utm_source === 'direct').length || 0);

      // Calculate source stats
      const sourceCounts: Record<string, number> = {};
      sessionsData?.forEach(s => {
        sourceCounts[s.utm_source] = (sourceCounts[s.utm_source] || 0) + 1;
      });
      setSourceStats(
        Object.entries(sourceCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Calculate campaign stats
      const campaignCounts: Record<string, number> = {};
      sessionsData?.forEach(s => {
        if (s.utm_campaign) {
          campaignCounts[s.utm_campaign] = (campaignCounts[s.utm_campaign] || 0) + 1;
        }
      });
      setCampaignStats(
        Object.entries(campaignCounts)
          .map(([campaign, count]) => ({ campaign, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Fetch user sources
      const { data: usersData, error: usersError } = await supabase
        .from('user_sources')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false })
        .limit(500);

      if (usersError) throw usersError;
      setUserSources(usersData || []);
      setTotalUsers(usersData?.length || 0);

    } catch (err: any) {
      console.error('Fetch error:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const exportSessionsCSV = () => {
    const headers = ['Session ID', 'Source', 'Medium', 'Campaign', 'Content', 'Term', 'Landing Page', 'Created At', 'User ID'];
    const rows = sessions.map(s => [
      s.session_id,
      s.utm_source,
      s.utm_medium,
      s.utm_campaign || '',
      s.utm_content || '',
      s.utm_term || '',
      s.landing_page || '',
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm:ss'),
      s.user_id || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utm-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sessions exported');
  };

  const filteredSessions = sessions.filter(s => 
    s.utm_source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.utm_campaign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.utm_medium.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">UTM Tracking</h1>
            <p className="text-muted-foreground">Track where your sessions and users come from</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportSessionsCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <Target className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direct Traffic</p>
                  <p className="text-2xl font-bold">{directTraffic}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referred Traffic</p>
                  <p className="text-2xl font-bold">{totalSessions - directTraffic}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="users">User Sources</TabsTrigger>
            <TabsTrigger value="comparison">First vs Last Touch</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By Source */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sessions by Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sourceStats.slice(0, 10).map((stat) => (
                      <div key={stat.source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={stat.source === 'direct' ? 'secondary' : 'default'}>
                            {stat.source}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(stat.count / totalSessions) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{stat.count}</span>
                        </div>
                      </div>
                    ))}
                    {sourceStats.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* By Campaign */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sessions by Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {campaignStats.slice(0, 10).map((stat) => (
                      <div key={stat.campaign} className="flex items-center justify-between">
                        <Badge variant="outline" className="max-w-[200px] truncate">
                          {stat.campaign}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(stat.count / totalSessions) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{stat.count}</span>
                        </div>
                      </div>
                    ))}
                    {campaignStats.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No campaigns tracked</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by source, campaign, or medium..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Landing Page</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.slice(0, 100).map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <Badge variant={session.utm_source === 'direct' ? 'secondary' : 'default'}>
                            {session.utm_source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{session.utm_medium}</TableCell>
                        <TableCell>
                          {session.utm_campaign ? (
                            <Badge variant="outline">{session.utm_campaign}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {session.landing_page}
                        </TableCell>
                        <TableCell>
                          {session.user_id ? (
                            <Badge variant="secondary" className="text-xs">Linked</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Anonymous</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(session.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No sessions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Sources Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Acquisition Sources</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>First Source</TableHead>
                      <TableHead>First Campaign</TableHead>
                      <TableHead>Last Source</TableHead>
                      <TableHead>Last Campaign</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSources.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={user.first_utm_source === 'direct' ? 'secondary' : 'default'}>
                            {user.first_utm_source || 'direct'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.first_utm_campaign ? (
                            <Badge variant="outline">{user.first_utm_campaign}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.last_utm_source === 'direct' ? 'secondary' : 'default'}>
                            {user.last_utm_source || 'direct'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_utm_campaign ? (
                            <Badge variant="outline">{user.last_utm_campaign}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {userSources.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No users tracked yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">First-Touch vs Last-Touch Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4 text-green-500">First-Touch Sources</h3>
                    <div className="space-y-2">
                      {(() => {
                        const firstTouchCounts: Record<string, number> = {};
                        userSources.forEach(u => {
                          const src = u.first_utm_source || 'direct';
                          firstTouchCounts[src] = (firstTouchCounts[src] || 0) + 1;
                        });
                        return Object.entries(firstTouchCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([source, count]) => (
                            <div key={source} className="flex justify-between items-center">
                              <Badge variant="secondary">{source}</Badge>
                              <span className="font-medium">{count}</span>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4 text-blue-500">Last-Touch Sources</h3>
                    <div className="space-y-2">
                      {(() => {
                        const lastTouchCounts: Record<string, number> = {};
                        userSources.forEach(u => {
                          const src = u.last_utm_source || 'direct';
                          lastTouchCounts[src] = (lastTouchCounts[src] || 0) + 1;
                        });
                        return Object.entries(lastTouchCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([source, count]) => (
                            <div key={source} className="flex justify-between items-center">
                              <Badge variant="secondary">{source}</Badge>
                              <span className="font-medium">{count}</span>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Embed Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Embed Code for propscholar.com</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add this script to your website to track UTM parameters and sessions:
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`<script>
(function() {
  const SUPABASE_URL = 'https://tisijoiblvcrigwhzprn.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpc2lqb2libHZjcmlnd2h6cHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4ODQsImV4cCI6MjA4MTQwODg4NH0.7A7QN4wjF1QEoBjdqBqhSALCzcKYhdVzBCpaIkgG5p8';
  
  function getCookie(name) {
    const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? decodeURIComponent(v[2]) : null;
  }
  
  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  
  function genId() {
    return 'utm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
  }
  
  const params = new URLSearchParams(window.location.search);
  let sessionId = getCookie('ps_utm_session_id');
  let isNew = !sessionId;
  
  if (isNew) {
    sessionId = genId();
    setCookie('ps_utm_session_id', sessionId, 30);
  }
  
  const utm = {
    session_id: sessionId,
    utm_source: params.get('utm_source') || 'direct',
    utm_medium: params.get('utm_medium') || 'none',
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
    utm_term: params.get('utm_term') || null,
    landing_page: window.location.href,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent
  };
  
  if (isNew) {
    setCookie('ps_utm_data', JSON.stringify(utm), 30);
  }
  
  fetch(SUPABASE_URL + '/rest/v1/utm_sessions', {
    method: isNew ? 'POST' : 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(isNew ? utm : { last_seen_at: new Date().toISOString() })
  }).catch(function() {});
})();
</script>`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
