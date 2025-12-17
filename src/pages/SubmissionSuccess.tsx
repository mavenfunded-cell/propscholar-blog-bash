import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative">
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

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* Success Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full animate-scale-in border-white/10 bg-[#111]/80 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2 text-white">
                Submission Successful!
              </h1>
              
              <p className="text-white/60 mb-6">
                Your blog entry has been submitted successfully. 
                {isEventActive && " You may submit another entry if you'd like to participate again."}
              </p>

              <div className="space-y-3">
                {isEventActive && (
                  <Link to={`/blog/${slug}`}>
                    <Button className="w-full gap-2 bg-white text-black hover:bg-white/90">
                      Submit Another Entry
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
                
                <Link to="/">
                  <Button variant="outline" className="w-full gap-2 border-white/20 text-white hover:bg-white/5">
                    <Home className="w-4 h-4" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </div>
  );
}
