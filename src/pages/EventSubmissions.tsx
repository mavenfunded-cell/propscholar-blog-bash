import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Mail, Phone, User, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  blog: string;
  word_count: number;
  submitted_at: string;
}

export default function EventSubmissions() {
  const { id } = useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin && id) {
      fetchEventAndSubmissions();
    }
  }, [isAdmin, id]);

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

      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load submissions');
      navigate('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.error('No submissions to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Word Count', 'Submitted At', 'Blog Content'];
    const rows = submissions.map(s => [
      s.name,
      s.email,
      s.phone,
      s.word_count.toString(),
      format(new Date(s.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
      `"${s.blog.replace(/"/g, '""')}"`
    ]);

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

  if (authLoading || loading) {
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
          to="/admin/dashboard" 
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
          <Button variant="outline" onClick={exportToCSV} disabled={submissions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Submissions Grid */}
        {submissions.length > 0 ? (
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <Card 
                key={submission.id} 
                className="cursor-pointer hover:border-gold/30 transition-colors"
                onClick={() => setSelectedSubmission(submission)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
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
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="w-3 h-3" />
                        {submission.word_count} words
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(submission.submitted_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                    {submission.blog}
                  </p>
                </CardContent>
              </Card>
            ))}
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
                </div>

                <ScrollArea className="h-[400px] rounded-lg border border-border p-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedSubmission.blog}
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
