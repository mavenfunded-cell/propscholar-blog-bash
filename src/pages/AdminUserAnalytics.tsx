import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogOut, 
  ArrowLeft,
  Clock,
  Globe,
  Users,
  TrendingUp,
  ArrowUpDown,
  FileText,
  Eye,
  Monitor
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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

interface SubmissionAnalytics {
  id: string;
  name: string;
  email: string;
  time_spent_seconds: number | null;
  word_count: number;
  submitted_at: string;
  event_title: string;
  event_id: string;
}

interface SessionAnalytics {
  id: string;
  session_id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  started_at: string;
  last_active_at: string;
  total_seconds: number;
  page_views: number;
  country: string | null;
  city: string | null;
}

export default function AdminUserAnalytics() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionAnalytics[]>([]);
  const [sessions, setSessions] = useState<SessionAnalytics[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sortOrder, setSortOrder] = useState<'high' | 'low'>('high');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [activeTab, setActiveTab] = useState('sessions');

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
    fetchData();
  }, [isLoggedIn, navigate]);

  const handleSignOut = () => {
    sessionStorage.removeItem('admin_logged_in');
    navigate(isAdminSubdomain() ? '/' : '/admin');
  };

  const fetchData = async () => {
    try {
      // Fetch events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title')
        .eq('competition_type', 'blog')
        .order('created_at', { ascending: false });

      setEvents(eventsData || []);

      // Fetch submissions with time spent
      const { data: submissionsData, error } = await supabase
        .from('submissions')
        .select(`
          id,
          name,
          email,
          time_spent_seconds,
          word_count,
          submitted_at,
          event_id,
          events!inner(title)
        `)
        .order('time_spent_seconds', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const formatted = (submissionsData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        time_spent_seconds: s.time_spent_seconds,
        word_count: s.word_count,
        submitted_at: s.submitted_at,
        event_title: s.events?.title || 'Unknown Event',
        event_id: s.event_id
      }));

      setSubmissions(formatted);

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .order('total_seconds', { ascending: false })
        .limit(500);

      // Get user emails + names for sessions
      const userIds = [...new Set((sessionsData || []).filter(s => s.user_id).map(s => s.user_id))];
      let emailMap: Record<string, string> = {};
      let nameMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const [{ data: coinsData }, { data: profilesData }] = await Promise.all([
          supabase.from('user_coins').select('user_id, email').in('user_id', userIds),
          supabase.from('profiles').select('id, full_name').in('id', userIds),
        ]);

        emailMap = (coinsData || []).reduce((acc, c) => {
          acc[c.user_id] = c.email;
          return acc;
        }, {} as Record<string, string>);

        nameMap = (profilesData || []).reduce((acc, p) => {
          if (p.full_name) acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      const formattedSessions = (sessionsData || []).map((s: any) => ({
        id: s.id,
        session_id: s.session_id,
        user_id: s.user_id,
        user_email: s.user_id ? emailMap[s.user_id] : null,
        user_name: s.user_id ? (nameMap[s.user_id] || null) : null,
        started_at: s.started_at,
        last_active_at: s.last_active_at,
        total_seconds: s.total_seconds,
        page_views: s.page_views,
        country: s.country,
        city: s.city,
      }));

      setSessions(formattedSessions);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };


  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const filteredSubmissions = submissions
    .filter(s => filterEvent === 'all' || s.event_id === filterEvent)
    .sort((a, b) => {
      const aTime = a.time_spent_seconds || 0;
      const bTime = b.time_spent_seconds || 0;
      return sortOrder === 'high' ? bTime - aTime : aTime - bTime;
    });

  const sortedSessions = [...sessions].sort((a, b) => {
    return sortOrder === 'high' ? b.total_seconds - a.total_seconds : a.total_seconds - b.total_seconds;
  });

  const totalTimeSpent = filteredSubmissions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
  const avgTimeSpent = filteredSubmissions.length > 0 ? totalTimeSpent / filteredSubmissions.length : 0;
  const submissionsWithTime = filteredSubmissions.filter(s => s.time_spent_seconds && s.time_spent_seconds > 0).length;

  // Session stats
  const totalSessionTime = sessions.reduce((sum, s) => sum + s.total_seconds, 0);
  const avgSessionTime = sessions.length > 0 ? totalSessionTime / sessions.length : 0;
  const totalPageViews = sessions.reduce((sum, s) => sum + s.page_views, 0);
  const loggedInSessions = sessions.filter(s => s.user_id).length;

  const userSessionTotals = Object.values(
    sessions
      .filter(s => s.user_id)
      .reduce((acc, s) => {
        const key = s.user_id as string;
        if (!acc[key]) {
          acc[key] = {
            user_id: key,
            user_email: s.user_email,
            user_name: s.user_name,
            total_seconds: 0,
            page_views: 0,
            sessions: 0,
            last_active_at: s.last_active_at,
            country: s.country || null,
            city: s.city || null,
          };
        }
        acc[key].total_seconds += s.total_seconds;
        acc[key].page_views += s.page_views;
        acc[key].sessions += 1;

        // Keep newest last_active + location from newest session that has it
        if (new Date(s.last_active_at) > new Date(acc[key].last_active_at)) {
          acc[key].last_active_at = s.last_active_at;
          if (s.city || s.country) {
            acc[key].city = s.city || null;
            acc[key].country = s.country || null;
          }
        } else if (!acc[key].city && !acc[key].country && (s.city || s.country)) {
          acc[key].city = s.city || null;
          acc[key].country = s.country || null;
        }

        return acc;
      }, {} as Record<string, any>)
  ).sort((a: any, b: any) => (sortOrder === 'high' ? b.total_seconds - a.total_seconds : a.total_seconds - b.total_seconds));

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">User Analytics</h1>
          <p className="text-muted-foreground">Track website sessions and user engagement</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Website Sessions
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blog Time
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Total Sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{sessions.length}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    Avg. Session Time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{formatTime(Math.round(avgSessionTime))}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    Total Page Views
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{totalPageViews.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Logged In Users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{loggedInSessions}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sessions.length > 0 ? Math.round((loggedInSessions / sessions.length) * 100) : 0}% of sessions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by time:</span>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'high' | 'low')}>
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High to Low</SelectItem>
                  <SelectItem value="low">Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sessions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Website Sessions
                </CardTitle>
                <CardDescription>
                  Time spent on website by visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Time on Site</TableHead>
                        <TableHead className="text-right">Page Views</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No sessions tracked yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedSessions.slice(0, 100).map((session, index) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              {session.user_id ? (
                                <div>
                                  <p className="font-medium">
                                    {session.user_name || session.user_email || 'User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {session.user_email || '—'}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-muted-foreground">Anonymous</p>
                                  <p className="text-xs text-muted-foreground/50 truncate max-w-[120px]">
                                    {session.session_id.slice(0, 12)}...
                                  </p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${
                                session.total_seconds > 600 ? 'text-green-500' :
                                session.total_seconds > 180 ? 'text-blue-500' :
                                session.total_seconds > 60 ? 'text-amber-500' : 'text-muted-foreground'
                              }`}>
                                {formatTime(session.total_seconds)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {session.page_views}
                            </TableCell>
                            <TableCell>
                              {session.city || session.country ? (
                                <div className="flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm">
                                    {[session.city, session.country].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Logged-in Users (aggregated) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Logged-in Users — Total Time on Site
                </CardTitle>
                <CardDescription>
                  Aggregated across sessions (highest to lowest)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Total Time</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Page Views</TableHead>
                          <TableHead className="text-right">Last Active</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {userSessionTotals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No logged-in sessions yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        userSessionTotals.slice(0, 100).map((u: any, idx: number) => (
                            <TableRow key={u.user_id}>
                              <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{u.user_name || '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{u.user_email || '—'}</TableCell>
                              <TableCell>
                                {u.city || u.country ? (
                                  <div className="flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm">{[u.city, u.country].filter(Boolean).join(', ')}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatTime(u.total_seconds)}</TableCell>
                              <TableCell className="text-right tabular-nums">{u.sessions}</TableCell>
                              <TableCell className="text-right tabular-nums">{u.page_views}</TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">
                                {formatDistanceToNow(new Date(u.last_active_at), { addSuffix: true })}
                              </TableCell>
                            </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Total Submissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{filteredSubmissions.length}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    Avg. Writing Time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{formatTime(Math.round(avgTimeSpent))}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    Total Writing Time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{formatTime(totalTimeSpent)}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    With Time Data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{submissionsWithTime}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredSubmissions.length > 0 ? Math.round((submissionsWithTime / filteredSubmissions.length) * 100) : 0}% of submissions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by time:</span>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'high' | 'low')}>
                  <SelectTrigger className="w-40">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High to Low</SelectItem>
                    <SelectItem value="low">Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by event:</span>
                <Select value={filterEvent} onValueChange={setFilterEvent}>
                  <SelectTrigger className="w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Writing Time Analysis
                </CardTitle>
                <CardDescription>
                  Time spent writing blog submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead className="text-right">Time Spent</TableHead>
                        <TableHead className="text-right">Words</TableHead>
                        <TableHead className="text-right">Words/Min</TableHead>
                        <TableHead className="text-right">Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No submissions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubmissions.map((submission, index) => {
                          const wordsPerMin = submission.time_spent_seconds && submission.time_spent_seconds > 0
                            ? Math.round((submission.word_count / submission.time_spent_seconds) * 60)
                            : null;
                          
                          return (
                            <TableRow key={submission.id}>
                              <TableCell className="font-medium text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{submission.name}</p>
                                  <p className="text-xs text-muted-foreground">{submission.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {submission.event_title}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {submission.time_spent_seconds ? (
                                  <span className={`font-medium ${
                                    submission.time_spent_seconds > 3600 ? 'text-green-500' :
                                    submission.time_spent_seconds > 1800 ? 'text-blue-500' :
                                    submission.time_spent_seconds > 600 ? 'text-amber-500' : 'text-muted-foreground'
                                  }`}>
                                    {formatTime(submission.time_spent_seconds)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {submission.word_count.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {wordsPerMin !== null ? (
                                  <span className={wordsPerMin > 50 ? 'text-amber-500' : ''}>
                                    {wordsPerMin}
                                  </span>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">
                                {format(new Date(submission.submitted_at), 'MMM d, HH:mm')}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}