import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { AdminLink } from '@/components/AdminLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, ThumbsUp, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  status: string;
}

interface Submission {
  id: string;
  name: string;
  blog_title: string | null;
}

export default function AdminAddVotes() {
  const navigate = useNavigate();
  const { getLoginPath, getDashboardPath } = useAdminNavigation();
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
  
  const [events, setEvents] = useState<Event[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [voterName, setVoterName] = useState<string>('');
  const [voterEmail, setVoterEmail] = useState<string>('');
  const [voteDate, setVoteDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [voteTime, setVoteTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [numberOfVotes, setNumberOfVotes] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recentVotes, setRecentVotes] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(getLoginPath(), { replace: true });
    }
  }, [isLoggedIn, navigate, getLoginPath]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchSubmissions();
      setSelectedSubmissionId('');
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      // Use RPC function to bypass RLS
      const { data, error } = await supabase.rpc('get_all_events');

      if (error) throw error;
      
      const blogEvents = (data || []).filter((e: any) => e.competition_type === 'blog');
      setEvents(blogEvents);
      
      // Auto-select first active event
      const activeEvent = blogEvents.find((e: any) => e.status === 'active');
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (blogEvents.length > 0) {
        setSelectedEventId(blogEvents[0].id);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // Use RPC function to get submissions for the event
      const { data, error } = await supabase.rpc('get_all_submissions_for_event', {
        _event_id: selectedEventId
      });

      if (error) throw error;
      setSubmissions((data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        blog_title: s.blog_title
      })));
    } catch (err) {
      console.error('Error fetching submissions:', err);
      toast.error('Failed to load submissions');
    }
  };

  const handleAddVotes = async () => {
    if (!selectedSubmissionId || !voterName.trim()) {
      toast.error('Please select a submission and enter a voter name');
      return;
    }

    setSubmitting(true);
    try {
      const voteDatetime = new Date(`${voteDate}T${voteTime}:00`);
      
      // Create multiple votes
      const votesData = [];
      for (let i = 0; i < numberOfVotes; i++) {
        votesData.push({
          submission_id: selectedSubmissionId,
          voter_name: numberOfVotes > 1 ? `${voterName} ${i + 1}` : voterName,
          voter_email: voterEmail.trim() || null,
          created_at: voteDatetime.toISOString()
        });
      }

      const { data, error } = await supabase
        .from('blog_votes')
        .insert(votesData)
        .select();

      if (error) throw error;

      toast.success(`Successfully added ${numberOfVotes} vote(s)`);
      
      // Add to recent votes
      setRecentVotes(prev => [...(data || []), ...prev].slice(0, 10));
      
      // Reset form
      setVoterName('');
      setVoterEmail('');
      setNumberOfVotes(1);
    } catch (err) {
      console.error('Error adding votes:', err);
      toast.error('Failed to add votes');
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmissionName = (submissionId: string) => {
    const sub = submissions.find(s => s.id === submissionId);
    return sub ? `${sub.name}${sub.blog_title ? ` - ${sub.blog_title}` : ''}` : 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <AdminLink to="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </AdminLink>
          <div>
            <h1 className="text-2xl font-bold text-white">Add Manual Votes</h1>
            <p className="text-white/50">Add votes to blog competition submissions</p>
          </div>
        </div>

        {/* Add Votes Form */}
        <Card className="mb-6 border-white/10 bg-[#111]/80">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Votes
            </CardTitle>
            <CardDescription className="text-white/50">
              Select a competition and submission, then add votes with custom name and datetime
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Selector */}
            <div className="space-y-2">
              <Label className="text-white">Competition</Label>
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
            </div>

            {/* Submission Selector */}
            <div className="space-y-2">
              <Label className="text-white">Submission</Label>
              <Select 
                value={selectedSubmissionId} 
                onValueChange={setSelectedSubmissionId}
                disabled={!selectedEventId || submissions.length === 0}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={submissions.length === 0 ? "No submissions found" : "Select a submission"} />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 max-h-[300px]">
                  {submissions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id} className="text-white">
                      {sub.name} {sub.blog_title && `- ${sub.blog_title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voter Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Voter Name *</Label>
                <Input
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="Enter voter name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Voter Email (optional)</Label>
                <Input
                  type="email"
                  value={voterEmail}
                  onChange={(e) => setVoterEmail(e.target.value)}
                  placeholder="Enter voter email"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Vote Date
                </Label>
                <Input
                  type="date"
                  value={voteDate}
                  onChange={(e) => setVoteDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Vote Time
                </Label>
                <Input
                  type="time"
                  value={voteTime}
                  onChange={(e) => setVoteTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  Number of Votes
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={numberOfVotes}
                  onChange={(e) => setNumberOfVotes(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            {numberOfVotes > 1 && (
              <p className="text-white/50 text-sm">
                Note: Multiple votes will be named "{voterName} 1", "{voterName} 2", etc.
              </p>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleAddVotes}
              disabled={submitting || !selectedSubmissionId || !voterName.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {submitting ? (
                'Adding Votes...'
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add {numberOfVotes} Vote{numberOfVotes > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Votes */}
        {recentVotes.length > 0 && (
          <Card className="border-white/10 bg-[#111]/80">
            <CardHeader>
              <CardTitle className="text-white text-lg">Recently Added Votes</CardTitle>
              <CardDescription className="text-white/50">
                Votes added in this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentVotes.map((vote, index) => (
                  <div 
                    key={vote.id || index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <ThumbsUp className="w-4 h-4 text-pink-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{vote.voter_name}</p>
                        <p className="text-white/40 text-xs">
                          {getSubmissionName(vote.submission_id)}
                        </p>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs">
                      {format(new Date(vote.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link to View All Votes */}
        <div className="mt-6 text-center">
          <AdminLink to="/votes">
            <Button
              variant="ghost"
              className="text-white/60 hover:text-white"
            >
              View All Votes →
            </Button>
          </AdminLink>
        </div>
      </div>
    </div>
  );
}
