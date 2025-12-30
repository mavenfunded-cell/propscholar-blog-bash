import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAdminSubdomain, getAdminPath } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Mail, Phone, User, Calendar, Download, Trophy, Crown, Medal, Award, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface Event {
  id: string;
  title: string;
  slug: string;
}

interface Submission {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string;
  blog_title: string | null;
  blog: string;
  word_count: number;
  submitted_at: string;
  time_spent_seconds: number | null;
}

interface Winner {
  id: string;
  submission_id: string;
  position: number;
}

export default function EventSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading } = useAdminAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWinners, setSavingWinners] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate(getAdminPath('/admin'));
      return;
    }
    if (id) {
      fetchEventAndSubmissions();
    }
  }, [authLoading, isLoggedIn, id, navigate]);

  const fetchEventAndSubmissions = async () => {
    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, slug')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch submissions using RPC function (bypasses RLS)
      const { data: submissionsData, error: submissionsError } = await supabase
        .rpc('get_all_submissions_for_event', { _event_id: id });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

      // Fetch existing winners
      const { data: winnersData, error: winnersError } = await supabase
        .from('winners')
        .select('*')
        .eq('event_id', id)
        .order('position', { ascending: true });

      if (!winnersError && winnersData) {
        setWinners(winnersData);
        setSelectedWinners(winnersData.map(w => w.submission_id));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load submissions');
      navigate(getAdminPath('/admin/dashboard'));
    } finally {
      setLoading(false);
    }
  };

  const toggleWinnerSelection = (submissionId: string) => {
    setSelectedWinners(prev => 
      prev.includes(submissionId)
        ? prev.filter(id => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const saveWinners = async () => {
    if (!id) return;
    setSavingWinners(true);

    try {
      // Delete existing winners for this event
      await supabase
        .from('winners')
        .delete()
        .eq('event_id', id);

      // Insert new winners with positions
      if (selectedWinners.length > 0) {
        const winnersToInsert = selectedWinners.map((submissionId, index) => ({
          event_id: id,
          submission_id: submissionId,
          position: index + 1
        }));

        const { error } = await supabase
          .from('winners')
          .insert(winnersToInsert);

        if (error) throw error;
      }

      toast.success('Winners saved successfully!');
      // Refresh winners data
      const { data: winnersData } = await supabase
        .from('winners')
        .select('*')
        .eq('event_id', id)
        .order('position', { ascending: true });
      
      if (winnersData) {
        setWinners(winnersData);
      }
    } catch (err) {
      console.error('Error saving winners:', err);
      toast.error('Failed to save winners');
    } finally {
      setSavingWinners(false);
    }
  };

  const getWinnerPosition = (submissionId: string): number | null => {
    const index = selectedWinners.indexOf(submissionId);
    return index >= 0 ? index + 1 : null;
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-amber-600" />;
      default: return <Award className="w-4 h-4 text-primary" />;
    }
  };

  const formatTimeSpent = (seconds: number | null): string => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.error('No submissions to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Word Count', 'Time Spent', 'Submitted At', 'Is Winner', 'Position', 'Blog Title', 'Blog Content'];
    const rows = submissions.map(s => {
      const position = getWinnerPosition(s.id);
      return [
        s.name,
        s.email,
        s.phone,
        s.word_count.toString(),
        formatTimeSpent(s.time_spent_seconds),
        format(new Date(s.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
        position ? 'Yes' : 'No',
        position?.toString() || '',
        `"${(s.blog_title || '').replace(/"/g, '""')}"`,
        `"${s.blog.replace(/"/g, '""')}"`
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.slug || 'submissions'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Exported successfully');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Authenticating...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Link 
          to={getAdminPath('/admin/dashboard')} 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        {/* Event Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold mb-1">{event?.title}</h1>
            <p className="text-muted-foreground">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={submissions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Winner Selection Section */}
        {submissions.length > 0 && (
          <Card className="mb-8 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Select Winners
              </CardTitle>
              <CardDescription>
                Check the boxes to select winners. The order you select them determines their position (1st, 2nd, 3rd, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Selected: {selectedWinners.length} winner{selectedWinners.length !== 1 ? 's' : ''}</span>
                </div>
                {selectedWinners.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedWinners.map((id, index) => {
                      const submission = submissions.find(s => s.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {getPositionIcon(index + 1)}
                          {submission?.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button 
                onClick={saveWinners} 
                disabled={savingWinners}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <Trophy className="w-4 h-4 mr-2" />
                {savingWinners ? 'Saving...' : 'Save Winners'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Submissions Grid */}
        {submissions.length > 0 ? (
          <div className="grid gap-4">
            {submissions.map((submission) => {
              const position = getWinnerPosition(submission.id);
              const isWinner = position !== null;
              
              return (
                <Card 
                  key={submission.id} 
                  className={`transition-colors ${
                    isWinner 
                      ? 'border-yellow-500/50 bg-yellow-500/5' 
                      : 'hover:border-gold/30'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Winner Checkbox */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`winner-${submission.id}`}
                          checked={isWinner}
                          onCheckedChange={() => toggleWinnerSelection(submission.id)}
                          className="border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                        />
                        {isWinner && (
                          <div className="flex items-center gap-1">
                            {getPositionIcon(position)}
                            <span className="text-sm font-medium">#{position}</span>
                          </div>
                        )}
                      </div>
                      
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{submission.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{submission.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            <span>{submission.phone}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <Badge variant="secondary" className="gap-1">
                          <FileText className="w-3 h-3" />
                          {submission.word_count} words
                        </Badge>
                        <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                          <Clock className="w-3 h-3" />
                          {formatTimeSpent(submission.time_spent_seconds)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(submission.submitted_at), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                    <div 
                      className="mt-4 cursor-pointer"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      {submission.blog_title && (
                        <p className="text-sm font-semibold text-foreground mb-1">{submission.blog_title}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.blog}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
            <p className="text-muted-foreground">Submissions will appear here once users start entering.</p>
          </Card>
        )}

        {/* Submission Detail Modal */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedSubmission?.name}
                {selectedSubmission && getWinnerPosition(selectedSubmission.id) && (
                  <Badge className="ml-2 bg-yellow-500 text-black">
                    {getPositionIcon(getWinnerPosition(selectedSubmission.id)!)}
                    Winner #{getWinnerPosition(selectedSubmission.id)}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Submitted on {selectedSubmission && format(new Date(selectedSubmission.submitted_at), 'MMMM d, yyyy at h:mm a')}
              </DialogDescription>
            </DialogHeader>
            
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${selectedSubmission.email}`} className="hover:text-gold transition-colors">
                      {selectedSubmission.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${selectedSubmission.phone}`} className="hover:text-gold transition-colors">
                      {selectedSubmission.phone}
                    </a>
                  </div>
                  <Badge variant="secondary">
                    {selectedSubmission.word_count} words
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                    <Clock className="w-3 h-3" />
                    {formatTimeSpent(selectedSubmission.time_spent_seconds)}
                  </Badge>
                </div>

                <ScrollArea className="h-[400px] rounded-lg border border-border p-4">
                  {selectedSubmission.blog_title && (
                    <h1 className="text-xl font-bold mb-4 text-foreground">{selectedSubmission.blog_title}</h1>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                        h2: ({children}) => <h2 className="text-lg font-semibold mt-3 mb-2 text-foreground">{children}</h2>,
                        h3: ({children}) => <h3 className="text-base font-semibold mt-3 mb-1 text-foreground">{children}</h3>,
                        p: ({children}) => <p className="mb-3 text-foreground/90 leading-relaxed">{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="text-foreground/90">{children}</li>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-3">{children}</blockquote>,
                        strong: ({children}) => <strong className="font-bold text-foreground">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                        a: ({href, children}) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {selectedSubmission.blog}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
