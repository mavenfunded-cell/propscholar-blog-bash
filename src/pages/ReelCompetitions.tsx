import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowLeft, XCircle, Video } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  featured_image_url: string | null;
  start_date: string;
  end_date: string;
  status: string;
  competition_type: string;
}

export default function ReelCompetitions() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('competition_type', 'reel')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = (event: Event) => {
    return event.status === 'active' && new Date(event.end_date) > new Date();
  };

  const isEventExpired = (event: Event) => {
    return new Date(event.end_date) < new Date();
  };

  const activeEvents = events.filter(isEventActive);
  const closedEvents = events.filter(e => !isEventActive(e));

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a] text-white">
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

        {/* Hero Section */}
        <section className="relative py-16 md:py-20 overflow-hidden">
          <div className="container mx-auto px-4 relative">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to PropScholar Space
            </Link>

            <div className="max-w-3xl animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Video className="w-6 h-6 text-white/70" />
                </div>
                <Badge variant="outline" className="border-white/20 text-white/70">
                  Reel Competition
                </Badge>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-white">
                Reel Making <span className="text-white/70">Contest</span>
              </h1>
              <p className="text-lg text-white/50 max-w-2xl">
                Create engaging video content about trading strategies, market insights, and financial education. Max 200MB per video.
              </p>
            </div>
          </div>
        </section>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 rounded-full bg-white" />
                <h2 className="text-2xl font-semibold text-white">Active Contests</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeEvents.map((event, index) => (
                  <Link key={event.id} to={`/reels/${event.slug}`}>
                    <Card className="h-full hover:border-white/20 transition-all duration-300 animate-slide-up group bg-[#111]/80 backdrop-blur-xl border border-white/10"
                      style={{ animationDelay: `${index * 100}ms` }}>
                      {event.featured_image_url && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img 
                            src={event.featured_image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                          <div className="absolute bottom-4 left-4">
                            <Video className="w-8 h-8 text-white/70" />
                          </div>
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-white/10 text-white border-white/20">Active</Badge>
                        </div>
                        <CardTitle className="text-white group-hover:text-white/80 transition-colors">{event.title}</CardTitle>
                        <CardDescription className="text-white/50 line-clamp-2">{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Ends {format(new Date(event.end_date), 'MMM d')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Closed Events */}
        {closedEvents.length > 0 && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 rounded-full bg-white/30" />
                <h2 className="text-2xl font-semibold text-white">Past Contests</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closedEvents.map((event, index) => (
                  <Link key={event.id} to={`/reels/${event.slug}`}>
                    <Card className="h-full opacity-80 hover:opacity-100 transition-all duration-300 animate-slide-up bg-[#111]/80 backdrop-blur-xl border border-white/10"
                      style={{ animationDelay: `${index * 100}ms` }}>
                      {event.featured_image_url && (
                        <div className="relative h-40 overflow-hidden rounded-t-xl">
                          <img 
                            src={event.featured_image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover grayscale"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/50 to-transparent" />
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-white/5 text-white/50 border-white/10">Closed</Badge>
                          {isEventExpired(event) && (
                            <Badge variant="outline" className="border-white/20 text-white/40 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-white/60">{event.title}</CardTitle>
                        <CardDescription className="text-white/40 line-clamp-2">{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-white/40">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Ended {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {events.length === 0 && !loading && (
          <section className="py-20">
            <div className="container mx-auto px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                <Video className="w-10 h-10 text-white/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">No Reel Contests Yet</h3>
              <p className="text-white/50">Check back soon for upcoming reel making contests.</p>
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <section className="py-20">
            <div className="container mx-auto px-4 text-center">
              <div className="animate-pulse">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10" />
                <div className="h-6 w-48 bg-white/10 rounded mx-auto mb-2" />
                <div className="h-4 w-64 bg-white/10 rounded mx-auto" />
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
}
