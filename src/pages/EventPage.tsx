import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Calendar, FileText, ArrowLeft, Trophy, XCircle, Crown, Medal, Award, Users, User, X, ThumbsUp, LogIn, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import ReactMarkdown from 'react-markdown';

interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  featured_image_url: string | null;
  start_date: string;
  end_date: string;
  min_words: number;
  status: string;
  rewards: string | null;
}

interface Winner {
  id: string;
  position: number;
  submission: {
    name: string;
  };
}

interface Submission {
  id: string;
  name: string;
  blog_title: string | null;
  blog: string;
}

interface LiveSubmission {
  id: string;
  name: string;
  blog_title: string | null;
  blog: string;
  vote_count: number;
}

interface Vote {
  id: string;
  voter_name: string;
  voter_email: string | null;
  created_at: string;
}

const submissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid Gmail address').refine(
    (email) => email.toLowerCase().endsWith('@gmail.com'),
    'Please use a Gmail address'
  ),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  blogTitle: z.string().min(5, 'Blog title must be at least 5 characters').max(200),
  blog: z.string(),
});

export default function EventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [liveSubmissions, setLiveSubmissions] = useState<LiveSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedLiveSubmission, setSelectedLiveSubmission] = useState<LiveSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Voting state
  const [voting, setVoting] = useState(false);
  const [showVoters, setShowVoters] = useState<string | null>(null);
  const [voters, setVoters] = useState<Vote[]>([]);
  const [userVotedSubmissions, setUserVotedSubmissions] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [blogTitle, setBlogTitle] = useState('');
  const [blog, setBlog] = useState('');
  const [wordCount, setWordCount] = useState(0);
  
  // Secret time tracking
  const [writingStartTime, setWritingStartTime] = useState<number | null>(null);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  useEffect(() => {
    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Event not found');
        navigate('/');
        return;
      }

      setEvent(data);

      // Check if event has ended (by date or status)
      const eventEnded = new Date(data.end_date) < new Date() || data.status === 'closed';

      // Fetch winners using public function (works for all users)
      const { data: winnersData, error: winnersError } = await supabase
        .rpc('get_event_winners', { _event_id: data.id });

      if (!winnersError && winnersData && winnersData.length > 0) {
        const formattedWinners = winnersData.map((w: { winner_id: string; winner_position: number; submission_name: string }) => ({
          id: w.winner_id,
          position: w.winner_position,
          submission: {
            name: w.submission_name
          }
        }));
        setWinners(formattedWinners);
      }

      // Fetch all submissions if event has ended
      if (eventEnded) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .rpc('get_event_submissions', { _event_id: data.id });

        if (!submissionsError && submissionsData) {
          setSubmissions(submissionsData.map((s: { submission_id: string; submission_name: string; submission_title: string | null; submission_blog: string }) => ({
            id: s.submission_id,
            name: s.submission_name,
            blog_title: s.submission_title,
            blog: s.submission_blog
          })));
        }
      } else if (data.status === 'active') {
        // Fetch live submissions for voting
        await fetchLiveSubmissions(data.id);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSubmissions = async (eventId: string) => {
    const { data, error } = await supabase
      .rpc('get_live_event_submissions', { _event_id: eventId });
    
    if (!error && data) {
      setLiveSubmissions(data.map((s: { submission_id: string; submission_name: string; submission_title: string | null; submission_blog: string; vote_count: number }) => ({
        id: s.submission_id,
        name: s.submission_name,
        blog_title: s.submission_title,
        blog: s.submission_blog,
        vote_count: s.vote_count
      })));
    }
  };

  const fetchVoters = async (submissionId: string) => {
    const { data, error } = await supabase
      .from('blog_votes')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setVoters(data);
    }
    setShowVoters(submissionId);
  };

  // Fetch user's votes and profile when logged in
  useEffect(() => {
    if (user && event) {
      fetchUserVotes();
      fetchUserProfile();
    }
  }, [user, event]);

  const fetchUserVotes = async () => {
    if (!user || !event) return;
    
    const { data } = await supabase
      .from('blog_votes')
      .select('submission_id')
      .eq('user_id', user.id);
    
    if (data) {
      setUserVotedSubmissions(data.map(v => v.submission_id));
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    
    setUserProfile(data);
  };

  const handleVote = async (submissionId: string) => {
    if (!user) {
      toast.error('Please login to vote');
      navigate('/auth');
      return;
    }

    if (userVotedSubmissions.includes(submissionId)) {
      toast.error('You have already voted for this submission');
      return;
    }

    setVoting(true);
    try {
      // Get voter name from profile or email
      const voterName = userProfile?.full_name || user.email?.split('@')[0] || 'Anonymous';
      
      const { error } = await supabase
        .from('blog_votes')
        .insert({
          submission_id: submissionId,
          voter_name: voterName,
          user_id: user.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already voted for this submission');
        } else {
          throw error;
        }
      } else {
        setUserVotedSubmissions([...userVotedSubmissions, submissionId]);
        toast.success('Vote submitted successfully!');
        if (event) {
          fetchLiveSubmissions(event.id);
        }
      }
    } catch (err) {
      console.error('Error voting:', err);
      toast.error('Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const isEventActive = event && event.status === 'active' && new Date(event.end_date) > new Date();
  const isEventExpired = event && new Date(event.end_date) < new Date();

  // Word count calculation and time tracking
  useEffect(() => {
    const words = blog.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    
    // Start timer when user first types
    if (blog.length > 0 && !writingStartTime) {
      setWritingStartTime(Date.now());
    }
  }, [blog, writingStartTime]);

  // Update time spent every second while writing
  useEffect(() => {
    if (!writingStartTime) return;
    
    const interval = setInterval(() => {
      setTotalTimeSpent(Math.floor((Date.now() - writingStartTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [writingStartTime]);

  // Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Disable keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        toast.error('Copy/Paste is disabled', { id: 'copy-paste-disabled' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle paste in blog textarea
  const handleBlogPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Paste is disabled in the blog field', { id: 'paste-disabled' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;

    // Validate form
    try {
      submissionSchema.parse({ name, email, phone, blogTitle, blog });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    // Check word count
    if (wordCount < event.min_words) {
      toast.error(`Your blog must be at least ${event.min_words} words`);
      return;
    }

    // Double check event is still active
    if (!isEventActive) {
      toast.error('This event is no longer accepting submissions');
      return;
    }

    setSubmitting(true);

    try {
      const submissionEmail = email.toLowerCase();
      const { error } = await supabase
        .from('submissions')
        .insert([{
          event_id: event.id,
          name,
          email: submissionEmail,
          phone,
          blog_title: blogTitle,
          blog,
          word_count: wordCount,
          time_spent_seconds: totalTimeSpent,
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already submitted an entry for this contest with this email.');
          return;
        }
        throw error;
      }

      // Grant participation coins (if user is registered)
      try {
        await supabase.rpc('grant_participation_coins', { 
          _email: submissionEmail, 
          _participation_type: 'blog' 
        });
      } catch (coinErr) {
        console.log('Participation coins not granted:', coinErr);
      }

      navigate(`/blog/${slug}/success`, { state: { name } });
    } catch (err: any) {
      console.error('Error submitting:', err);
      if (err?.message?.includes('Rate limit exceeded')) {
        toast.error(err.message);
      } else {
        toast.error('Failed to submit. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-white" />;
      case 2: return <Medal className="w-5 h-5 text-white/70" />;
      case 3: return <Medal className="w-5 h-5 text-white/50" />;
      default: return <Award className="w-5 h-5 text-white/40" />;
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${position}th Place`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0c0c] to-[#101010]" />
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Featured Image */}
        {event.featured_image_url && (
          <div className="relative h-64 md:h-96 overflow-hidden">
            <img 
              src={event.featured_image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
          </div>
        )}

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/blog" 
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to contests
            </Link>
            
            {/* Leaderboard Button - Top Right */}
            {isEventActive && liveSubmissions.length > 0 && (
              <button
                onClick={() => setShowLeaderboard(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 hover:from-yellow-500/30 hover:to-amber-600/30 transition-all"
              >
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-bold text-white">Leaderboard</span>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-xs font-bold text-yellow-500">{liveSubmissions.length}</span>
              </button>
            )}
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Event Info */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Badge 
                  className={
                    isEventActive
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }
                >
                  {isEventActive ? 'Active' : 'Closed'}
                </Badge>
                {isEventExpired && (
                  <Badge variant="outline" className="border-white/20 text-white/50 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Expired
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">{event.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-white/50 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span>
                    {format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/70" />
                  <span>Minimum {event.min_words} words</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-white/70 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>

            {/* Rewards Card */}
            {event.rewards && (
              <Card className="mb-8 border-white/10 bg-[#111]/80 backdrop-blur-xl animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Contest Rewards</h3>
                      <p className="text-white/60 whitespace-pre-wrap">{event.rewards}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Winners Section (shown when winners exist) */}
            {winners.length > 0 && (
              <Card className="mb-8 border-white/10 bg-[#111]/80 backdrop-blur-xl animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Trophy className="w-5 h-5 text-white" />
                    Contest Winners
                  </CardTitle>
                  <CardDescription className="text-white/50">
                    Congratulations to our winners!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {winners.map((winner) => (
                      <div 
                        key={winner.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        {getPositionIcon(winner.position)}
                        <div className="flex-1">
                          <p className="font-semibold text-white">{winner.submission.name}</p>
                          <p className="text-sm text-white/50">{getPositionLabel(winner.position)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Submission Form or Closed Message */}
            {isEventActive ? (
              <>
              <Card className="animate-slide-up border-white/10 bg-[#111]/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Submit Your Entry</CardTitle>
                  <CardDescription className="text-white/50">
                    Share your insights and compete in this blog writing contest
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/80">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">Gmail Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@gmail.com"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white/80">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Your phone number"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Article Title */}
                    <div className="space-y-2">
                      <Label htmlFor="blogTitle" className="text-white/80">
                        Article Title <span className="text-white/50">*</span>
                      </Label>
                      <Input
                        id="blogTitle"
                        value={blogTitle}
                        onChange={(e) => setBlogTitle(e.target.value)}
                        placeholder="e.g., How to Start Trading with PropScholar"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Blog */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-white/80">Article Content <span className="text-white/50">*</span></Label>
                        <span className={`text-sm ${wordCount >= event.min_words ? 'text-white' : 'text-white/50'}`}>
                          {wordCount} / {event.min_words} words
                        </span>
                      </div>
                      <MarkdownEditor
                        value={blog}
                        onChange={setBlog}
                        onPaste={handleBlogPaste}
                        placeholder="Write your article content in Markdown..."
                        minHeight="350px"
                        rows={14}
                      />
                      <p className="text-xs text-white/40">
                        Copy and paste is disabled. You must type your entry directly.
                      </p>
                    </div>

                    {/* Submit */}
                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full bg-white text-black hover:bg-white/90 transition-all"
                      disabled={submitting || wordCount < event.min_words}
                    >
                      {submitting ? 'Submitting...' : 'Submit Entry'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Live Submissions with Voting */}
              {liveSubmissions.length > 0 && (
                <Card className="mt-8 animate-fade-in border-white/10 bg-[#111]/80 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <ThumbsUp className="w-5 h-5 text-white" />
                      Vote for Your Favorite ({liveSubmissions.length} entries)
                    </CardTitle>
                    <CardDescription className="text-white/50">
                      Support participants by voting for their submissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {liveSubmissions.map((submission) => (
                        <div 
                          key={submission.id}
                          className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-base font-semibold text-white">
                              {submission.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{submission.name}</p>
                            {submission.blog_title && (
                              <p className="text-sm text-white/50 truncate">{submission.blog_title}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedLiveSubmission(submission)}
                              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                              title="View Blog"
                            >
                              <Eye className="w-4 h-4 text-white/60" />
                            </button>
                            <button
                              onClick={() => fetchVoters(submission.id)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <Users className="w-4 h-4 text-white/60" />
                              <span className="text-white font-medium">{submission.vote_count}</span>
                            </button>
                            <Button
                              size="sm"
                              onClick={() => handleVote(submission.id)}
                              disabled={voting || userVotedSubmissions.includes(submission.id)}
                              className={userVotedSubmissions.includes(submission.id) 
                                ? "bg-white/20 text-white/60 cursor-not-allowed" 
                                : "bg-white text-black hover:bg-white/90"}
                            >
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              {userVotedSubmissions.includes(submission.id) ? 'Voted' : (user ? 'Vote' : 'Login to Vote')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              </>
            ) : (
              <>
                <Card className="animate-fade-in border-white/10 bg-[#111]/80 backdrop-blur-xl">
                  <CardContent className="p-8 text-center">
                    <XCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Contest Closed</h3>
                    <p className="text-white/50">
                      This contest is no longer accepting submissions.
                    </p>
                  </CardContent>
                </Card>

                {/* All Participants Gallery */}
                {submissions.length > 0 && (
                  <Card className="mt-8 animate-fade-in border-white/10 bg-[#111]/80 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Users className="w-5 h-5 text-white" />
                        All Participants ({submissions.length})
                      </CardTitle>
                      <CardDescription className="text-white/50">
                        Everyone who participated in this contest
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {submissions.map((submission) => (
                          <button 
                            key={submission.id}
                            onClick={() => setSelectedSubmission(submission)}
                            className="flex flex-col items-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer text-left"
                          >
                            {/* Avatar with initials */}
                            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
                              <span className="text-lg font-semibold text-white">
                                {submission.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <p className="font-medium text-white text-center text-sm truncate w-full">
                              {submission.name}
                            </p>
                            {submission.blog_title && (
                              <p className="text-xs text-white/40 text-center truncate w-full mt-1">
                                {submission.blog_title}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* Submission View Modal */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] bg-[#111] border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-white">
                  {selectedSubmission?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-white text-lg">
                  {selectedSubmission?.blog_title || 'Untitled'}
                </DialogTitle>
                <p className="text-white/50 text-sm mt-1">by {selectedSubmission?.name}</p>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-6">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{selectedSubmission?.blog || ''}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Voters List Modal */}
      <Dialog open={!!showVoters} onOpenChange={() => setShowVoters(null)}>
        <DialogContent className="max-w-md bg-[#111] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Voters ({voters.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {voters.length === 0 ? (
              <p className="text-white/50 text-center py-8">No votes yet</p>
            ) : (
              <div className="space-y-2">
                {voters.map((vote) => (
                  <div key={vote.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {vote.voter_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{vote.voter_name}</p>
                      <p className="text-white/40 text-xs">
                        {format(new Date(vote.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Live Submission View Modal */}
      <Dialog open={!!selectedLiveSubmission} onOpenChange={() => setSelectedLiveSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] bg-[#111] border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-white">
                  {selectedLiveSubmission?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-white text-lg">
                  {selectedLiveSubmission?.blog_title || 'Untitled'}
                </DialogTitle>
                <p className="text-white/50 text-sm mt-1">by {selectedLiveSubmission?.name}</p>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-6">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{selectedLiveSubmission?.blog || ''}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-lg max-h-[85vh] bg-[#111] border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <span className="block">Live Leaderboard</span>
                <span className="text-sm font-normal text-white/50">
                  {liveSubmissions.length} participants • {liveSubmissions.reduce((sum, s) => sum + s.vote_count, 0)} votes
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-2">
              {[...liveSubmissions]
                .sort((a, b) => b.vote_count - a.vote_count)
                .map((submission, index) => {
                  const rank = index + 1;
                  return (
                    <div 
                      key={submission.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        rank === 1 
                          ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30' 
                          : rank === 2 
                            ? 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/30'
                            : rank === 3
                              ? 'bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/30'
                              : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        rank === 1 
                          ? 'bg-yellow-500/20' 
                          : rank === 2 
                            ? 'bg-gray-400/20'
                            : rank === 3
                              ? 'bg-amber-600/20'
                              : 'bg-white/10'
                      }`}>
                        {rank <= 3 ? (
                          rank === 1 ? <Crown className="w-4 h-4 text-yellow-500" /> :
                          rank === 2 ? <Medal className="w-4 h-4 text-gray-400" /> :
                          <Medal className="w-4 h-4 text-amber-600" />
                        ) : (
                          <span className="text-sm font-bold text-white/60">#{rank}</span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-white">
                          {submission.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{submission.name}</p>
                        {submission.blog_title && (
                          <p className="text-sm text-white/50 truncate">{submission.blog_title}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedLiveSubmission(submission);
                            setShowLeaderboard(false);
                          }}
                          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="View Blog"
                        >
                          <Eye className="w-4 h-4 text-white/60" />
                        </button>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                          <ThumbsUp className="w-3 h-3 text-white/40" />
                          <span className="text-sm font-bold text-white">{submission.vote_count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
