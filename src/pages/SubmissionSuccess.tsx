import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  end_date: string;
  status: string;
}

export default function SubmissionSuccess() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  const fetchEvent = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, slug, end_date, status')
        .eq('slug', slug)
        .maybeSingle();

      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = event && event.status === 'active' && new Date(event.end_date) > new Date();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>

      {/* Success Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-success/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
        
        <Card className="max-w-md w-full relative animate-scale-in border-success/30">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center animate-pulse-glow">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-2">
              Submission Successful!
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Your blog entry has been submitted successfully. 
              {isEventActive && " You may submit another entry if you'd like to participate again."}
            </p>

            <div className="space-y-3">
              {isEventActive && (
                <Link to={`/events/${slug}`}>
                  <Button variant="gold" className="w-full gap-2">
                    Submit Another Entry
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              
              <Link to="/">
                <Button variant="outline" className="w-full gap-2">
                  <Home className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PropScholar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
