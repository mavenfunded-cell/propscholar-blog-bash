import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  ArrowLeft,
  Clock,
  Globe,
  Users,
  TrendingUp,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
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

export default function AdminUserAnalytics() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionAnalytics[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sortOrder, setSortOrder] = useState<'high' | 'low'>('high');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

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
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin');
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

  const totalTimeSpent = filteredSubmissions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
  const avgTimeSpent = filteredSubmissions.length > 0 ? totalTimeSpent / filteredSubmissions.length : 0;
  const submissionsWithTime = filteredSubmissions.filter(s => s.time_spent_seconds && s.time_spent_seconds > 0).length;

  if (loading || loadingData) {
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
            <span className="text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
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
          <p className="text-muted-foreground">Track user engagement and time spent on submissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                Avg. Time Spent
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
                Total Time Tracked
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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
              Time Spent Analysis
            </CardTitle>
            <CardDescription>
              Submissions sorted by time spent writing
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

        {/* Note about location */}
        <Card className="mt-6 border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-500" />
              Location Tracking
            </CardTitle>
            <CardDescription>
              Location data requires additional user consent and IP geolocation service integration. 
              Currently tracking time spent on submissions. Contact support to enable location tracking.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}