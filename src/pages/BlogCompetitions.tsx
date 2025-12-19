import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, ArrowLeft, XCircle, PenTool, Trophy, Crown, Medal, ThumbsUp, Gift, Coins, Star, Award, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useSEO } from '@/hooks/useSEO';

interface Prize {
  position: number;
  title: string;
  prize: string;
  link?: string;
}

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
  prizes: Prize[] | null;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  blog_title: string | null;
  vote_count: number;
}

export default function BlogCompetitions() {
  useSEO();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [selectedRewardEvent, setSelectedRewardEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('competition_type', 'blog')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data || []).map(e => ({
        ...e,
        prizes: (e.prizes as unknown) as Prize[] | null
      })));
      
      // Fetch participant counts for active events
      if (data) {
        const activeEventIds = data
          .filter(e => e.status === 'active' && new Date(e.end_date) > new Date())
          .map(e => e.id);
        
        if (activeEventIds.length > 0) {
          const counts: Record<string, number> = {};
          await Promise.all(activeEventIds.map(async (eventId) => {
            const { data: submissions } = await supabase
              .rpc('get_live_event_submissions', { _event_id: eventId });
            counts[eventId] = submissions?.length || 0;
          }));
          setParticipantCounts(counts);
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingLeaderboard(true);
    try {
      const { data, error } = await supabase
        .rpc('get_live_event_submissions', { _event_id: event.id });
      
      if (!error && data) {
        setLeaderboard(data.map((s: { submission_id: string; submission_name: string; submission_title: string | null; vote_count: number }) => ({
          id: s.submission_id,
          name: s.submission_name,
          blog_title: s.submission_title,
          vote_count: s.vote_count
        })));
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const openRewardsModal = (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRewardEvent(event);
    setShowRewardsModal(true);
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
                  <PenTool className="w-6 h-6 text-white/70" />
                </div>
                <Badge variant="outline" className="border-white/20 text-white/70">
                  Blog Competition
                </Badge>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-white">
                Blog Writing <span className="text-white/70">Contest</span>
              </h1>
              <p className="text-lg text-white/50 max-w-2xl mb-6">
                Share your trading insights, market analysis, and financial knowledge through compelling articles.
              </p>
              <Link to="/rewards">
                <Button className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-semibold">
                  <Gift className="w-4 h-4" />
                  Go to Rewards
                </Button>
              </Link>
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
                  <Link key={event.id} to={`/blog/${event.slug}`}>
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
                        </div>
                      )}
                      <CardHeader className={event.featured_image_url ? 'pt-4' : ''}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-white/10 text-white border-white/20">Active</Badge>
                          {participantCounts[event.id] > 0 && (
                            <Badge variant="outline" className="border-white/20 text-white/70">
                              {participantCounts[event.id]} {participantCounts[event.id] === 1 ? 'entry' : 'entries'}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-white group-hover:text-white/80 transition-colors">{event.title}</CardTitle>
                        <CardDescription className="text-white/50 line-clamp-2">{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-white/50">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Ends {format(new Date(event.end_date), 'MMM d')}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                fetchLeaderboard(event);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 hover:from-yellow-500/30 hover:to-amber-600/30 transition-all"
                            >
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              <span className="text-xs font-bold text-yellow-500">Leaderboard</span>
                            </button>
                          </div>
                          <button
                            onClick={(e) => openRewardsModal(event, e)}
                            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white"
                          >
                            <Gift className="w-4 h-4" />
                            <span className="text-sm font-medium">View Rewards</span>
                          </button>
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
                  <Link key={event.id} to={`/blog/${event.slug}`}>
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
                <PenTool className="w-10 h-10 text-white/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">No Blog Contests Yet</h3>
              <p className="text-white/50">Check back soon for upcoming blog writing contests.</p>
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

      {/* Leaderboard Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] bg-[#111] border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <span className="block">{selectedEvent?.title}</span>
                <span className="text-sm font-normal text-white/50">
                  {leaderboard.length} participants • {leaderboard.reduce((sum, s) => sum + s.vote_count, 0)} votes
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingLeaderboard ? (
              <div className="p-8 text-center">
                <div className="animate-pulse text-white/50">Loading leaderboard...</div>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                No submissions yet
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {[...leaderboard]
                  .sort((a, b) => b.vote_count - a.vote_count)
                  .map((entry, index) => {
                    const rank = index + 1;
                    return (
                      <div 
                        key={entry.id}
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
                            {entry.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{entry.name}</p>
                          {entry.blog_title && (
                            <p className="text-sm text-white/50 truncate">{entry.blog_title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                          <ThumbsUp className="w-3 h-3 text-white/40" />
                          <span className="text-sm font-bold text-white">{entry.vote_count}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Rewards Modal */}
      <Dialog open={showRewardsModal} onOpenChange={setShowRewardsModal}>
        <DialogContent className="max-w-md bg-[#111] border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <span className="block">Participation Rewards</span>
                <span className="text-sm font-normal text-white/50">
                  {selectedRewardEvent?.title}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {/* Participation Coins */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-600/10 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold text-white">Space Coins</p>
                  <p className="text-sm text-white/50">Earn coins for participating</p>
                </div>
              </div>
              <p className="text-sm text-white/60 mt-2">
                Submit your blog entry to earn Space Coins that can be redeemed for exclusive rewards.
              </p>
            </div>

            {/* Winner Prizes */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white/70" />
                </div>
                <div>
                  <p className="font-semibold text-white">Winner Prizes</p>
                  <p className="text-sm text-white/50">Top performers get special rewards</p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedRewardEvent?.prizes && selectedRewardEvent.prizes.length > 0 ? (
                  selectedRewardEvent.prizes.map((prize, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {prize.position === 1 ? (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      ) : prize.position === 2 ? (
                        <Medal className="w-4 h-4 text-gray-400" />
                      ) : prize.position === 3 ? (
                        <Medal className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Award className="w-4 h-4 text-white/50" />
                      )}
                      <span className="text-white/70">{prize.title} - {prize.prize}</span>
                      {prize.link && (
                        <a 
                          href={prize.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-yellow-500 hover:text-yellow-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/50">Prize details coming soon</p>
                )}
              </div>
            </div>

            {/* Special Bonus */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white/70" />
                </div>
                <div>
                  <p className="font-semibold text-white">Bonus Rewards</p>
                  <p className="text-sm text-white/50">Extra coins for social media engagement</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2 pt-2">
              {selectedRewardEvent && (
                <Link to={`/blog/${selectedRewardEvent.slug}`} onClick={() => setShowRewardsModal(false)}>
                  <Button className="w-full gap-2 bg-white text-black hover:bg-white/90">
                    <PenTool className="w-4 h-4" />
                    Participate Now
                  </Button>
                </Link>
              )}
              <Link to="/rewards" onClick={() => setShowRewardsModal(false)}>
                <Button variant="outline" className="w-full gap-2 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                  <Gift className="w-4 h-4" />
                  Go to Rewards
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
