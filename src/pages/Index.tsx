import { useEffect, useState, useRef } from 'react';
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
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [events]);

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

  const addToRefs = (el: HTMLElement | null, index: number) => {
    if (el) sectionsRef.current[index] = el;
  };

  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* Deep space background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#050508] to-[#030303]" />
        
        {/* Subtle star field effect */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.25), transparent),
                           radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,0.2), transparent)`,
          backgroundSize: '200px 200px'
        }} />
        
        {/* Ambient glow orbs */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-white/[0.015] rounded-full blur-[120px] space-float" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-white/[0.01] rounded-full blur-[100px] space-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-white/[0.02] to-transparent rounded-full" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          {/* Hero ambient glow */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-white/[0.03] rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="hero-fade-in delay-0">
                <Badge variant="outline" className="mb-8 border-white/10 text-white/60 px-5 py-1.5 bg-white/[0.02] backdrop-blur-sm">
                  Share Your Insights
                </Badge>
              </div>
              
              <h1 className="hero-fade-in delay-100 text-5xl md:text-7xl font-light mb-8 leading-[1.1] tracking-tight">
                <span className="text-white/90">Blog Writing</span>
                <br />
                <span className="text-white font-medium">Contest</span>
              </h1>
              
              <p className="hero-fade-in delay-200 text-lg text-white/40 mb-10 max-w-xl mx-auto leading-relaxed font-light">
                Join our exclusive blog writing contests. Share your knowledge, showcase your writing skills, 
                and compete with fellow traders and analysts.
              </p>
              
              {activeEvents.length > 0 && (
                <div className="hero-fade-in delay-300">
                  <Link to={`/events/${activeEvents[0].slug}`}>
                    <Button 
                      size="lg" 
                      className="group relative overflow-hidden bg-white text-black hover:bg-white/90 px-8 h-14 text-base font-medium rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        Enter Current Contest
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Active Events */}
        {activeEvents.length > 0 && (
          <section 
            ref={(el) => addToRefs(el, 0)} 
            className="py-20 scroll-reveal"
          >
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1 h-6 rounded-full bg-white/30" />
                <h2 className="text-xl font-light text-white/80 tracking-wide">Active Contests</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeEvents.map((event, index) => (
                  <Link key={event.id} to={`/events/${event.slug}`}>
                    <Card 
                      className="group h-full border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 rounded-2xl overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {event.featured_image_url && (
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={event.featured_image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-5' : ''}>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20 text-xs font-normal">
                            Active
                          </Badge>
                        </div>
                        <CardTitle className="text-white/90 font-medium text-lg group-hover:text-white transition-colors duration-300">
                          {event.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-white/40 font-light">
                          {event.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-white/30">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-light">Ends {format(new Date(event.end_date), 'MMM d')}</span>
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
          <section 
            ref={(el) => addToRefs(el, 1)} 
            className="py-20 scroll-reveal"
          >
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1 h-6 rounded-full bg-white/10" />
                <h2 className="text-xl font-light text-white/50 tracking-wide">Past Contests</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closedEvents.map((event, index) => (
                  <Link key={event.id} to={`/events/${event.slug}`}>
                    <Card 
                      className="h-full border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.08] transition-all duration-500 rounded-2xl overflow-hidden opacity-70 hover:opacity-90"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {event.featured_image_url && (
                        <div className="relative h-40 overflow-hidden">
                          <img 
                            src={event.featured_image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover grayscale"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-white/5 text-white/40 border-white/10 text-xs font-normal">
                            Closed
                          </Badge>
                          {isEventExpired(event) && (
                            <Badge variant="outline" className="border-white/10 text-white/30 flex items-center gap-1 text-xs font-normal">
                              <XCircle className="w-3 h-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-white/50 font-medium text-lg">{event.title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-white/30 font-light">{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-white/25">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-light">Ended {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
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
        <div ref={(el) => addToRefs(el, 2)} className="scroll-reveal">
          <ReferralCTA />
        </div>

        {/* PropScholar Invitation */}
        <section ref={(el) => addToRefs(el, 3)} className="py-20 scroll-reveal">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <PropScholarInvitation />
            </div>
          </div>
        </section>

        {/* Empty State */}
        {events.length === 0 && !loading && (
          <section className="py-24">
            <div className="container mx-auto px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-light mb-3 text-white/70">No Contests Yet</h3>
              <p className="text-white/30 font-light">Check back soon for upcoming writing contests.</p>
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <section className="py-24">
            <div className="container mx-auto px-4 text-center">
              <div className="inline-block">
                <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
}