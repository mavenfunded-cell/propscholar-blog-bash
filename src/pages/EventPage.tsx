import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [blog, setBlog] = useState('');
  const [wordCount, setWordCount] = useState(0);

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
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = event && event.status === 'active' && new Date(event.end_date) > new Date();

  // Word count calculation
  useEffect(() => {
    const words = blog.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [blog]);

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
        }]);

      if (error) throw error;

      navigate(`/events/${slug}/success`);
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>

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
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
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
            </div>
            
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">{event.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Minimum {event.min_words} words</span>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-foreground/80 whitespace-pre-wrap">{event.description}</p>
            </div>
          </div>

          {/* Submission Form or Closed Message */}
          {isEventActive ? (
            <Card className="animate-slide-up border-border/50">
              <CardHeader>
                <CardTitle>Submit Your Entry</CardTitle>
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
                      className="no-select resize-y min-h-[300px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Note: Copy and paste is disabled. You must type your entry directly.
                    </p>
                  </div>

                  {/* Submit */}
                  <Button 
                    type="submit" 
                    variant="gold" 
                    size="lg"
                    className="w-full"
                    disabled={submitting || wordCount < event.min_words}
                  >
                    {submitting ? 'Submitting...' : 'Submit Entry'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 animate-slide-up">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">Submissions Closed</h3>
                <p className="text-muted-foreground">
                  Submissions for this event are closed. Thank you for your interest!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PropScholar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
