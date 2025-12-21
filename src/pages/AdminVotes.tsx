import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, ThumbsUp, Trash2, Users, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  status: string;
}

interface Vote {
  id: string;
  submission_id: string;
  voter_name: string;
  created_at: string;
  submission?: {
    name: string;
    blog_title: string | null;
  };
}

interface SubmissionVotes {
  submission_id: string;
  submission_name: string;
  blog_title: string | null;
  votes: Vote[];
}

export default function AdminVotes() {
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [submissionVotes, setSubmissionVotes] = useState<SubmissionVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteVoteId, setDeleteVoteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
    fetchEvents();
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (selectedEventId) {
      fetchVotes();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, status')
        .eq('competition_type', 'blog')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
      
      // Auto-select first active event
      const activeEvent = data?.find(e => e.status === 'active');
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchVotes = async () => {
    try {
      // First get submissions for this event
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('id, name, blog_title')
        .eq('event_id', selectedEventId);

      if (subError) throw subError;

      // Then get votes for each submission
      const votesPromises = (submissions || []).map(async (sub) => {
        const { data: votes, error: votesError } = await supabase
          .from('blog_votes')
          .select('*')
          .eq('submission_id', sub.id)
          .order('created_at', { ascending: false });

        if (votesError) throw votesError;

        return {
          submission_id: sub.id,
          submission_name: sub.name,
          blog_title: sub.blog_title,
          votes: votes || []
        };
      });

      const results = await Promise.all(votesPromises);
      // Sort by vote count descending
      results.sort((a, b) => b.votes.length - a.votes.length);
      setSubmissionVotes(results);
    } catch (err) {
      console.error('Error fetching votes:', err);
      toast.error('Failed to load votes');
    }
  };

  const handleDeleteVote = async () => {
    if (!deleteVoteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('blog_votes')
        .delete()
        .eq('id', deleteVoteId);

      if (error) throw error;

      toast.success('Vote deleted successfully');
      setDeleteVoteId(null);
      fetchVotes();
    } catch (err) {
      console.error('Error deleting vote:', err);
      toast.error('Failed to delete vote');
    } finally {
      setDeleting(false);
    }
  };

  const totalVotes = submissionVotes.reduce((sum, s) => sum + s.votes.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/dashboard')}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Votes</h1>
            <p className="text-white/50">View and manage blog competition votes</p>
          </div>
        </div>

        {/* Event Selector */}
        <Card className="mb-6 border-white/10 bg-[#111]/80">
          <CardHeader>
            <CardTitle className="text-white text-lg">Select Competition</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a competition" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10">
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} className="text-white">
                    {event.title} ({event.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedEventId && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-white/10 bg-[#111]/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ThumbsUp className="w-8 h-8 text-white/60" />
                  <div>
                    <p className="text-2xl font-bold text-white">{totalVotes}</p>
                    <p className="text-white/50 text-sm">Total Votes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-[#111]/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-white/60" />
                  <div>
                    <p className="text-2xl font-bold text-white">{submissionVotes.length}</p>
                    <p className="text-white/50 text-sm">Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-[#111]/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <User className="w-8 h-8 text-white/60" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {submissionVotes.length > 0 ? Math.max(...submissionVotes.map(s => s.votes.length)) : 0}
                    </p>
                    <p className="text-white/50 text-sm">Highest Votes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submissions with Votes */}
        {selectedEventId && (
          <div className="space-y-4">
            {submissionVotes.length === 0 ? (
              <Card className="border-white/10 bg-[#111]/80">
                <CardContent className="p-8 text-center">
                  <ThumbsUp className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No submissions found for this competition</p>
                </CardContent>
              </Card>
            ) : (
              submissionVotes.map((sub, index) => (
                <Card key={sub.submission_id} className="border-white/10 bg-[#111]/80">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">#{index + 1}</span>
                        </div>
                        <div>
                          <CardTitle className="text-white text-base">{sub.submission_name}</CardTitle>
                          {sub.blog_title && (
                            <CardDescription className="text-white/50">{sub.blog_title}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10">
                        <ThumbsUp className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">{sub.votes.length}</span>
                      </div>
                    </div>
                  </CardHeader>
                  {sub.votes.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-white/50 text-sm mb-3">Voters:</p>
                        <div className="space-y-2">
                          {sub.votes.map((vote) => (
                            <div key={vote.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-white">
                                    {vote.voter_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{vote.voter_name}</p>
                                  <p className="text-white/40 text-xs flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(vote.created_at), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteVoteId(vote.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteVoteId} onOpenChange={() => setDeleteVoteId(null)}>
          <DialogContent className="bg-[#111] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Vote</DialogTitle>
            </DialogHeader>
            <p className="text-white/60">Are you sure you want to delete this vote? This action cannot be undone.</p>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteVoteId(null)}
                className="text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteVote}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
