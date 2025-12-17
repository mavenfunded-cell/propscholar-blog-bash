import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, FileText, Film, Calendar, Clock, User, Phone, Mail, Instagram, Twitter, ExternalLink, Award, Loader2, Coins, CheckCircle } from 'lucide-react';
import { WinnerClaimDialog } from '@/components/WinnerClaimDialog';

interface Submission {
  id: string;
  name: string;
  email: string;
  blog_title: string | null;
  submitted_at: string;
  event_id: string;
  event_title?: string;
  is_winner?: boolean;
  position?: number;
}

interface ReelSubmission {
  id: string;
  name: string;
  email: string;
  title: string;
  submitted_at: string;
  event_id: string;
  event_title?: string;
  is_winner?: boolean;
  position?: number;
}

interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface WinnerClaim {
  id: string;
  winner_type: string;
  event_id: string;
  submission_id: string;
  position: number;
  status: string;
  event_title?: string;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blogSubmissions, setBlogSubmissions] = useState<Submission[]>([]);
  const [reelSubmissions, setReelSubmissions] = useState<ReelSubmission[]>([]);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [winnerClaims, setWinnerClaims] = useState<WinnerClaim[]>([]);
  const [unclaimedWin, setUnclaimedWin] = useState<WinnerClaim | null>(null);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.email) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch coin balance
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      setCoinBalance(coinsData?.balance || 0);
      // Fetch blog submissions with event titles and winner status
      const { data: blogs } = await supabase
        .from('submissions')
        .select(`
          id, name, email, blog_title, submitted_at, event_id
        `)
        .eq('email', user.email)
        .order('submitted_at', { ascending: false });

      // Get event titles and winner status for blogs
      if (blogs && blogs.length > 0) {
        const eventIds = [...new Set(blogs.map(b => b.event_id))];
        const { data: events } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);

        const { data: winners } = await supabase
          .from('winners')
          .select('submission_id, position')
          .in('submission_id', blogs.map(b => b.id));

        const enrichedBlogs = blogs.map(blog => ({
          ...blog,
          event_title: events?.find(e => e.id === blog.event_id)?.title,
          is_winner: winners?.some(w => w.submission_id === blog.id),
          position: winners?.find(w => w.submission_id === blog.id)?.position
        }));

        setBlogSubmissions(enrichedBlogs);
      }

      // Fetch reel submissions with event titles and winner status
      const { data: reels } = await supabase
        .from('reel_submissions')
        .select(`
          id, name, email, title, submitted_at, event_id
        `)
        .eq('email', user.email)
        .order('submitted_at', { ascending: false });

      if (reels && reels.length > 0) {
        const eventIds = [...new Set(reels.map(r => r.event_id))];
        const { data: events } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);

        const { data: reelWinners } = await supabase
          .from('reel_winners')
          .select('submission_id, position')
          .in('submission_id', reels.map(r => r.id));

        const enrichedReels = reels.map(reel => ({
          ...reel,
          event_title: events?.find(e => e.id === reel.event_id)?.title,
          is_winner: reelWinners?.some(w => w.submission_id === reel.id),
          position: reelWinners?.find(w => w.submission_id === reel.id)?.position
        }));

        setReelSubmissions(enrichedReels);
      }

      // Fetch winner claims for this user
      const { data: winnerClaimsData } = await supabase
        .from('winner_claims')
        .select('*')
        .eq('user_email', user.email);

      if (winnerClaimsData && winnerClaimsData.length > 0) {
        // Get event titles
        const eventIds = [...new Set(winnerClaimsData.map(c => c.event_id))];
        const { data: events } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);

        const enrichedClaims = winnerClaimsData.map(claim => ({
          ...claim,
          event_title: events?.find(e => e.id === claim.event_id)?.title
        }));

        setWinnerClaims(enrichedClaims);

        // Check for unclaimed wins and show popup
        const unclaimed = enrichedClaims.find(c => c.status === 'unclaimed');
        if (unclaimed) {
          setUnclaimedWin(unclaimed);
          setShowWinnerDialog(true);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWinnerClaimed = () => {
    fetchDashboardData();
  };

  const totalWins = [...blogSubmissions, ...reelSubmissions].filter(s => s.is_winner).length;
  const totalParticipations = blogSubmissions.length + reelSubmissions.length;

  const getPositionBadge = (position: number) => {
    const badges: Record<number, string> = {
      1: '🥇 1st Place',
      2: '🥈 2nd Place',
      3: '🥉 3rd Place'
    };
    return badges[position] || `${position}th Place`;
  };

  const socialLinks = [
    { name: 'Instagram', icon: Instagram, url: 'https://instagram.com/propscholar', color: 'hover:text-pink-400' },
    { name: 'Twitter', icon: Twitter, url: 'https://twitter.com/propscholar', color: 'hover:text-blue-400' },
    { name: 'Trustpilot', icon: Award, url: 'https://trustpilot.com/review/propscholar.com', color: 'hover:text-green-400' },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">Track your PropScholar journey</p>
          </div>

          {/* Profile Section */}
          <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'PropScholar User'}
                </h2>
                <div className="flex flex-col md:flex-row gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <Link to="/blog">
                <Button className="bg-primary hover:bg-primary/90">
                  Participate in Events
                </Button>
              </Link>
            </div>
          </Card>

          {/* Space Coins Card */}
          <Link to="/rewards">
            <Card className="p-6 bg-gradient-to-br from-yellow-500/10 via-card to-orange-500/10 backdrop-blur-xl border-yellow-500/20 hover:border-yellow-500/40 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <Coins className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-500">{coinBalance}</h3>
                    <p className="text-sm text-muted-foreground">Space Coins</p>
                  </div>
                </div>
                <Button variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                  Earn & Claim Rewards
                </Button>
              </div>
            </Card>
          </Link>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50 text-center">
              <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{totalParticipations}</p>
              <p className="text-sm text-muted-foreground">Events Participated</p>
            </Card>
            <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{totalWins}</p>
              <p className="text-sm text-muted-foreground">Events Won</p>
            </Card>
            <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50 text-center">
              <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{blogSubmissions.length}</p>
              <p className="text-sm text-muted-foreground">Blogs Written</p>
            </Card>
            <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50 text-center">
              <Film className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{reelSubmissions.length}</p>
              <p className="text-sm text-muted-foreground">Reels Submitted</p>
            </Card>
          </div>

          {/* Submissions Section */}
          <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
            <h3 className="text-xl font-bold text-foreground mb-4">My Submissions</h3>
            
            <Tabs defaultValue="blogs" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="blogs">Blogs ({blogSubmissions.length})</TabsTrigger>
                <TabsTrigger value="reels">Reels ({reelSubmissions.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="blogs">
                {blogSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No blog submissions yet</p>
                    <Link to="/blog">
                      <Button variant="outline" className="mt-4">
                        Participate Now
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blogSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">
                            {submission.blog_title || 'Untitled Blog'}
                          </h4>
                          <p className="text-sm text-muted-foreground">{submission.event_title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          {submission.is_winner ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                              <Trophy className="w-4 h-4" />
                              {getPositionBadge(submission.position || 1)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                              <Clock className="w-4 h-4" />
                              Results Awaiting
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="reels">
                {reelSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No reel submissions yet</p>
                    <Link to="/reels">
                      <Button variant="outline" className="mt-4">
                        Submit a Reel
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reelSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{submission.title}</h4>
                          <p className="text-sm text-muted-foreground">{submission.event_title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          {submission.is_winner ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
                              <Trophy className="w-4 h-4" />
                              {getPositionBadge(submission.position || 1)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                              <Clock className="w-4 h-4" />
                              Results Awaiting
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Winning History */}
          {totalWins > 0 && (
            <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Winning History
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[...blogSubmissions, ...reelSubmissions]
                  .filter(s => s.is_winner)
                  .map((win) => {
                    // Find the claim status for this win
                    const claim = winnerClaims.find(c => c.submission_id === win.id);
                    const claimStatus = claim?.status || 'unclaimed';
                    
                    return (
                      <div
                        key={win.id}
                        className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">
                              {win.position === 1 ? '🥇' : win.position === 2 ? '🥈' : '🥉'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {'blog_title' in win ? win.blog_title : win.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">{win.event_title}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {claimStatus === 'issued' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Reward Issued
                              </span>
                            ) : claimStatus === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                                <Clock className="w-3 h-3" />
                                Processing
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (claim) {
                                    setUnclaimedWin({ ...claim, event_title: win.event_title });
                                    setShowWinnerDialog(true);
                                  }
                                }}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs"
                              >
                                Claim Reward
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}

          {/* Social Links */}
          <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50">
            <h3 className="text-xl font-bold text-foreground mb-4">Connect with PropScholar</h3>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-background/50 border border-border/30 text-muted-foreground transition-colors ${link.color}`}
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.name}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Link to="/blog">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Participate in More Events
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      {/* Winner Claim Dialog */}
      <WinnerClaimDialog
        claim={unclaimedWin}
        open={showWinnerDialog}
        onOpenChange={setShowWinnerDialog}
        onClaimed={handleWinnerClaimed}
      />
    </div>
  );
};

export default Dashboard;