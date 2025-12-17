import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, FileText, AlertCircle, ArrowLeft, Trophy, XCircle, Crown, Medal, Award } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

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

const submissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid Gmail address').refine(
    (email) => email.toLowerCase().endsWith('@gmail.com'),
    'Please use a Gmail address'
  ),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  blog: z.string(),
});

export default function EventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
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
      submissionSchema.parse({ name, email, phone, blog });
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
      const { error } = await supabase
        .from('submissions')
        .insert([{
          event_id: event.id,
          name,
          email: email.toLowerCase(),
          phone,
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

      navigate(`/events/${slug}/success`);
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
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <Award className="w-5 h-5 text-primary" />;
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Full page gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-background to-[#0d1f3c]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
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
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <main className="container mx-auto px-4 py-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to contests
          </Link>

          <div className="max-w-3xl mx-auto">
            {/* Event Info */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Badge 
                  className={
                    isEventActive
                      ? 'bg-success/20 text-success border-success/30'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {isEventActive ? 'Active' : 'Closed'}
                </Badge>
                {isEventExpired && (
                  <Badge variant="outline" className="border-destructive/50 text-destructive flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Expired
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{event.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>
                    {format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Minimum {event.min_words} words</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-foreground/80 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>

            {/* Rewards Card */}
            {event.rewards && (
              <Card className="mb-8 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Contest Rewards</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{event.rewards}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Winners Section (shown when winners exist) */}
            {winners.length > 0 && (
              <Card className="mb-8 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Contest Winners
                  </CardTitle>
                  <CardDescription>
                    Congratulations to our winners!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {winners.map((winner) => (
                      <div 
                        key={winner.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                      >
                        {getPositionIcon(winner.position)}
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{winner.submission.name}</p>
                          <p className="text-sm text-muted-foreground">{getPositionLabel(winner.position)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Form or Closed Message */}
            {isEventActive ? (
              <Card className="animate-slide-up border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">Submit Your Entry</CardTitle>
                  <CardDescription>
                    Share your insights and compete in this blog writing contest
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="bg-secondary/50 border-border focus:border-primary"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Gmail Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@gmail.com"
                        required
                        className="bg-secondary/50 border-border focus:border-primary"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Your phone number"
                        required
                        className="bg-secondary/50 border-border focus:border-primary"
                      />
                    </div>

                    {/* Blog */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="blog">Your Blog Entry</Label>
                        <span className={`text-sm ${wordCount >= event.min_words ? 'text-success' : 'text-muted-foreground'}`}>
                          {wordCount} / {event.min_words} words
                        </span>
                      </div>
                      <Textarea
                        id="blog"
                        value={blog}
                        onChange={(e) => setBlog(e.target.value)}
                        onPaste={handleBlogPaste}
                        placeholder="Type your blog entry here... (Copy/Paste is disabled)"
                        rows={12}
                        className="no-select resize-y min-h-[300px] bg-secondary/50 border-border focus:border-primary"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Note: Copy and paste is disabled. You must type your entry directly.
                      </p>
                    </div>

                    {/* Submit */}
                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={submitting || wordCount < event.min_words}
                    >
                      {submitting ? 'Submitting...' : 'Submit Entry'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 animate-slide-up bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    {isEventExpired ? 'Contest Has Expired' : 'Submissions Closed'}
                  </h3>
                  <p className="text-muted-foreground">
                    {isEventExpired 
                      ? 'This contest has ended. Thank you for your interest!' 
                      : 'Submissions for this event are closed. Thank you for your interest!'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
