import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { PropScholarInvitation } from '@/components/PropScholarInvitation';
import { ReferralCTA } from '@/components/ReferralCTA';

interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  featured_image_url: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

export default function Index() {
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
    <div className="min-h-screen bg-background relative">
      {/* Full page gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-background to-[#0d1f3c]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <Badge variant="outline" className="mb-6 border-primary/30 text-primary px-4 py-1">
                Share Your Insights
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-foreground">
                Blog Writing <span className="text-primary">Contest</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join our exclusive blog writing contests. Share your knowledge, showcase your writing skills, 
                and compete with fellow traders and analysts.
              </p>
              {activeEvents.length > 0 && (
                <Link to={`/events/${activeEvents[0].slug}`}>
                  <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Enter Current Contest
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 rounded-full bg-success" />
                <h2 className="text-2xl font-semibold text-foreground">Active Contests</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeEvents.map((event, index) => (
                  <Link key={event.id} to={`/events/${event.slug}`}>
                    <Card className="h-full hover:border-primary/30 hover:shadow-glow transition-all duration-300 animate-slide-up group bg-card/80 backdrop-blur-sm"
                      style={{ animationDelay: `${index * 100}ms` }}>
                      {event.featured_image_url && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img 
                            src={event.featured_image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-success/20 text-success border-success/30">Active</Badge>
                        </div>
                        <CardTitle className="group-hover:text-primary transition-colors">{event.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 rounded-full bg-muted" />
                <h2 className="text-2xl font-semibold text-foreground">Past Contests</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closedEvents.map((event, index) => (
                  <Link key={event.id} to={`/events/${event.slug}`}>
                    <Card className="h-full opacity-80 hover:opacity-100 transition-all duration-300 animate-slide-up bg-card/80 backdrop-blur-sm"
                      style={{ animationDelay: `${index * 100}ms` }}>
                      {event.featured_image_url && (
                        <div className="relative h-40 overflow-hidden rounded-t-xl">
                          <img 
                            src={event.featured_image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover grayscale"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">Closed</Badge>
                          {isEventExpired(event) && (
                            <Badge variant="outline" className="border-destructive/50 text-destructive flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-muted-foreground">{event.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

        {/* Referral CTA */}
        <ReferralCTA />

        {/* PropScholar Invitation */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <PropScholarInvitation />
            </div>
          </div>
        </section>

        {/* Empty State */}
        {events.length === 0 && !loading && (
          <section className="py-20">
            <div className="container mx-auto px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                <Calendar className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No Contests Yet</h3>
              <p className="text-muted-foreground">Check back soon for upcoming writing contests.</p>
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <section className="py-20">
            <div className="container mx-auto px-4 text-center">
              <div className="animate-pulse">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary" />
                <div className="h-6 w-48 bg-secondary rounded mx-auto mb-2" />
                <div className="h-4 w-64 bg-secondary rounded mx-auto" />
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
}
