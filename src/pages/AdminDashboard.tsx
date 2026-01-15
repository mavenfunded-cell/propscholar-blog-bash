import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AdminLink } from '@/components/AdminLink';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminNotificationBell } from '@/components/AdminNotificationBell';
import {
  Plus,
  Calendar,
  FileText,
  LogOut,
  Edit2,
  Eye,
  XCircle,
  CheckCircle,
  Users,
  ExternalLink,
  Trash2,
  PenTool,
  Video,
  Coins,
  Gift,
  Settings,
  Ticket,
  Share2,
  Trophy,
  Search,
  ThumbsUp,
  Mail,
  Clock,
  UserPlus,
  Brain,
  MessageSquare,
  BarChart3,
  GraduationCap,
  Megaphone,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  created_at: string;
  competition_type: string;
}

interface EventWithCount extends Event {
  submission_count: number;
}

// Quick link configuration for cleaner rendering
const quickLinks = [
  { to: '/admin/conversion', icon: TrendingDown, label: 'Conversion Intel', color: 'text-rose-400', borderColor: 'border-rose-500/30', gradient: 'from-rose-500/10 to-red-500/5', highlight: true },
  { to: '/admin/rewards', icon: Settings, label: 'Reward Settings', color: 'text-amber-400', borderColor: 'border-amber-500/20' },
  { to: '/admin/coupons', icon: Ticket, label: 'Coupon Management', color: 'text-violet-400', borderColor: 'border-violet-500/20' },
  { to: '/admin/users-coins', icon: Coins, label: 'User Coins', color: 'text-yellow-400', borderColor: 'border-yellow-500/20' },
  { to: '/admin/claims', icon: Gift, label: 'Reward Claims', color: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  { to: '/admin/winner-claims', icon: Trophy, label: 'Winner Claims', color: 'text-amber-500', borderColor: 'border-amber-500/30', highlight: true },
  { to: '/admin/social-follows', icon: Share2, label: 'Social Screenshots', color: 'text-blue-400', borderColor: 'border-blue-500/20' },
  { to: '/admin/votes', icon: ThumbsUp, label: 'Blog Votes', color: 'text-pink-400', borderColor: 'border-pink-500/20' },
  { to: '/admin/add-votes', icon: Plus, label: 'Add Manual Votes', color: 'text-orange-400', borderColor: 'border-orange-500/20' },
  { to: '/admin/seo', icon: Search, label: 'SEO Management', color: 'text-green-400', borderColor: 'border-green-500/20' },
  { to: '/admin/emails', icon: Mail, label: 'Email Logs', color: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
  { to: '/admin/notifications', icon: Users, label: 'Send Notifications', color: 'text-blue-400', borderColor: 'border-blue-500/20' },
  { to: '/admin/analytics', icon: Clock, label: 'User Analytics', color: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  { to: '/admin/referrals', icon: UserPlus, label: 'Referral Logs', color: 'text-indigo-400', borderColor: 'border-indigo-500/20' },
  { to: '/admin/tickets', icon: Mail, label: 'Support Tickets', color: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
  { to: '/admin/reviews', icon: Trophy, label: 'Ticket Reviews', color: 'text-yellow-400', borderColor: 'border-yellow-500/20' },
  { to: '/admin/ai-knowledge', icon: Brain, label: 'Train AI', color: 'text-violet-400', borderColor: 'border-violet-500/20' },
  { to: '/admin/canned-messages', icon: MessageSquare, label: 'Canned Messages', color: 'text-teal-400', borderColor: 'border-teal-500/20' },
  { to: '/admin/ai-usage', icon: BarChart3, label: 'AI Usage', color: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
  { to: '/admin/scholar-hub', icon: GraduationCap, label: 'Scholar Hub', color: 'text-amber-400', borderColor: 'border-amber-500/30', gradient: 'from-amber-500/10 to-orange-500/5' },
  { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns', color: 'text-rose-400', borderColor: 'border-rose-500/30', gradient: 'from-rose-500/10 to-pink-500/5' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading, signOut, email } = useAdminAuth();

  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) return;
    fetchEvents();
  }, [authLoading, isLoggedIn]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      const { data: blogCounts } = await supabase.rpc('get_event_submission_counts');
      const { data: reelCounts } = await supabase.rpc('get_reel_event_submission_counts');

      const blogCountMap = new Map((blogCounts || []).map((c: any) => [c.event_id, Number(c.count)]));
      const reelCountMap = new Map((reelCounts || []).map((c: any) => [c.event_id, Number(c.count)]));

      const eventsWithCounts = (eventsData || []).map((event) => {
        const countMap = event.competition_type === 'reel' ? reelCountMap : blogCountMap;
        return {
          ...event,
          submission_count: countMap.get(event.id) || 0,
        };
      });

      setEvents(eventsWithCounts);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const toggleEventStatus = async (event: EventWithCount) => {
    const newStatus = event.status === 'active' ? 'closed' : 'active';
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (error) throw error;

      setEvents(events.map(e => 
        e.id === event.id ? { ...e, status: newStatus } : e
      ));
      
      toast.success(`Event ${newStatus === 'active' ? 'opened' : 'closed'}`);
    } catch (err) {
      console.error('Error updating event:', err);
      toast.error('Failed to update event');
    }
  };

  const deleteEvent = async (eventId: string) => {
    setDeletingEventId(eventId);
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.filter(e => e.id !== eventId));
      toast.success('Event deleted permanently');
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const isEventExpired = (endDate: string) => new Date(endDate) < new Date();

  if (authLoading || loadingEvents) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  const blogEvents = events.filter(e => e.competition_type === 'blog');
  const reelEvents = events.filter(e => e.competition_type === 'reel');
  
  const activeBlogEvents = blogEvents.filter(e => e.status === 'active' && !isEventExpired(e.end_date));
  const activeReelEvents = reelEvents.filter(e => e.status === 'active' && !isEventExpired(e.end_date));
  
  const totalBlogSubmissions = blogEvents.reduce((sum, e) => sum + e.submission_count, 0);
  const totalReelSubmissions = reelEvents.reduce((sum, e) => sum + e.submission_count, 0);

  const renderEventCard = (event: EventWithCount) => (
    <Card key={event.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-all group">
      <div className="flex flex-col md:flex-row">
        {event.featured_image_url && (
          <div className="md:w-48 h-40 md:h-auto flex-shrink-0 overflow-hidden">
            <img 
              src={event.featured_image_url} 
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="flex-1 p-5">
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <Badge 
              className={`rounded-full px-2.5 ${
                event.status === 'active' && !isEventExpired(event.end_date)
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted/80 text-muted-foreground border border-border/50'
              }`}
            >
              {event.status === 'active' && !isEventExpired(event.end_date) ? 'Active' : 'Closed'}
            </Badge>
            {isEventExpired(event.end_date) && event.status === 'active' && (
              <Badge variant="outline" className="rounded-full px-2.5 border-amber-500/30 text-amber-400">
                Expired
              </Badge>
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{event.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
            </div>
            {event.competition_type === 'blog' && (
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Min {event.min_words} words</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{event.submission_count} submissions</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminLink to={`/admin/events/${event.id}/edit`}>
              <Button variant="outline" size="sm" className="rounded-lg h-8 border-border/50">
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            </AdminLink>
            <AdminLink to={`/admin/events/${event.id}/submissions`}>
              <Button variant="outline" size="sm" className="rounded-lg h-8 border-border/50">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Submissions
              </Button>
            </AdminLink>
            <a 
              href={event.competition_type === 'reel' ? `/reels/${event.slug}` : `/events/${event.slug}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="rounded-lg h-8">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View Public
              </Button>
            </a>
            <Button 
              variant="ghost" 
              size="sm"
              className="rounded-lg h-8"
              onClick={() => toggleEventStatus(event)}
            >
              {event.status === 'active' ? (
                <>
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Close
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Reopen
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="rounded-lg h-8 text-red-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-border/50">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event Permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the event 
                    "{event.title}" and all {event.submission_count} associated submissions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteEvent(event.id)}
                    className="rounded-lg bg-red-600 text-white hover:bg-red-700"
                    disabled={deletingEventId === event.id}
                  >
                    {deletingEventId === event.id ? 'Deleting...' : 'Delete Permanently'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {isAdminSubdomain() ? (
            <AdminLink to="/admin/dashboard">
              <Logo />
            </AdminLink>
          ) : (
            <Link to="/">
              <Logo />
            </Link>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:block">
              {email || 'Admin'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="rounded-lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <AdminNotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {quickLinks.map((link) => (
            <AdminLink key={link.to} to={link.to}>
              <Card className={`h-full border-border/40 ${link.borderColor} ${link.gradient ? `bg-gradient-to-br ${link.gradient}` : 'bg-card/30'} hover:bg-card/60 hover:border-border/60 transition-all cursor-pointer group`}>
                <CardHeader className="p-4">
                  <CardDescription className="flex items-center gap-2.5 text-sm">
                    <link.icon className={`w-4 h-4 ${link.color} group-hover:scale-110 transition-transform`} />
                    <span className="truncate">{link.label}</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
          ))}
        </div>

        {/* Events Section */}
        <Tabs defaultValue="blog" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-muted/50 rounded-lg p-1">
              <TabsTrigger value="blog" className="gap-2 rounded-md data-[state=active]:bg-background">
                <PenTool className="w-4 h-4" />
                Blog ({blogEvents.length})
              </TabsTrigger>
              <TabsTrigger value="reel" className="gap-2 rounded-md data-[state=active]:bg-background">
                <Video className="w-4 h-4" />
                Reels ({reelEvents.length})
              </TabsTrigger>
            </TabsList>
            
            <Link to="/admin/events/new">
              <Button className="rounded-lg bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>

          {/* Blog Tab */}
          <TabsContent value="blog" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardHeader className="p-4">
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <PenTool className="w-4 h-4 text-blue-400" />
                    Blog Events
                  </CardDescription>
                  <CardTitle className="text-3xl font-semibold tabular-nums">{blogEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="p-4">
                  <CardDescription className="text-sm">Active Blog Contests</CardDescription>
                  <CardTitle className="text-3xl font-semibold text-emerald-400 tabular-nums">{activeBlogEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="p-4">
                  <CardDescription className="text-sm">Total Blog Submissions</CardDescription>
                  <CardTitle className="text-3xl font-semibold text-primary tabular-nums">{totalBlogSubmissions}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Blog Events List */}
            <div className="space-y-4">
              {blogEvents.map(renderEventCard)}

              {blogEvents.length === 0 && (
                <Card className="p-12 text-center border-border/50 bg-card/30">
                  <PenTool className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No Blog Events Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first blog writing event to get started.</p>
                  <Link to="/admin/events/new">
                    <Button className="rounded-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Blog Event
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Reel Tab */}
          <TabsContent value="reel" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent">
                <CardHeader className="p-4">
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-violet-400" />
                    Reel Events
                  </CardDescription>
                  <CardTitle className="text-3xl font-semibold tabular-nums">{reelEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="p-4">
                  <CardDescription className="text-sm">Active Reel Contests</CardDescription>
                  <CardTitle className="text-3xl font-semibold text-emerald-400 tabular-nums">{activeReelEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="p-4">
                  <CardDescription className="text-sm">Total Reel Submissions</CardDescription>
                  <CardTitle className="text-3xl font-semibold text-violet-400 tabular-nums">{totalReelSubmissions}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Reel Events List */}
            <div className="space-y-4">
              {reelEvents.map(renderEventCard)}

              {reelEvents.length === 0 && (
                <Card className="p-12 text-center border-border/50 bg-card/30">
                  <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No Reel Events Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first reel making event to get started.</p>
                  <Link to="/admin/events/new">
                    <Button className="rounded-lg bg-violet-600 hover:bg-violet-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Reel Event
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
