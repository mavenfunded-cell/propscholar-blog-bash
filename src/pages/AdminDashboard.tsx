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
  GraduationCap
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
    fetchEvents();
  }, [isLoggedIn, navigate]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch submission counts using RPC functions (bypasses RLS)
      const { data: blogCounts } = await supabase.rpc('get_event_submission_counts');
      const { data: reelCounts } = await supabase.rpc('get_reel_event_submission_counts');

      // Create maps for quick lookup
      const blogCountMap = new Map((blogCounts || []).map((c: any) => [c.event_id, Number(c.count)]));
      const reelCountMap = new Map((reelCounts || []).map((c: any) => [c.event_id, Number(c.count)]));

      const eventsWithCounts = (eventsData || []).map((event) => {
        const countMap = event.competition_type === 'reel' ? reelCountMap : blogCountMap;
        return {
          ...event,
          submission_count: countMap.get(event.id) || 0
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

  const handleSignOut = () => {
    sessionStorage.removeItem('admin_logged_in');
    navigate(isAdminSubdomain() ? '/' : '/admin');
  };

  const isEventExpired = (endDate: string) => new Date(endDate) < new Date();

  if (loadingEvents) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const blogEvents = events.filter(e => e.competition_type === 'blog');
  const reelEvents = events.filter(e => e.competition_type === 'reel');
  
  const activeBlogEvents = blogEvents.filter(e => e.status === 'active' && !isEventExpired(e.end_date));
  const activeReelEvents = reelEvents.filter(e => e.status === 'active' && !isEventExpired(e.end_date));
  
  const totalBlogSubmissions = blogEvents.reduce((sum, e) => sum + e.submission_count, 0);
  const totalReelSubmissions = reelEvents.reduce((sum, e) => sum + e.submission_count, 0);

  const renderEventCard = (event: EventWithCount) => (
    <Card key={event.id} className="overflow-hidden hover:border-border transition-colors">
      <div className="flex flex-col md:flex-row">
        {event.featured_image_url && (
          <div className="md:w-48 h-40 md:h-auto flex-shrink-0">
            <img 
              src={event.featured_image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 p-6">
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <Badge 
              className={
                event.status === 'active' && !isEventExpired(event.end_date)
                  ? 'bg-success/20 text-success border-success/30'
                  : 'bg-muted text-muted-foreground'
              }
            >
              {event.status === 'active' && !isEventExpired(event.end_date) ? 'Active' : 'Closed'}
            </Badge>
            {isEventExpired(event.end_date) && event.status === 'active' && (
              <Badge variant="outline" className="border-warning text-warning">
                Expired
              </Badge>
            )}
          </div>
          
          <h3 className="text-xl font-display font-semibold mb-1">{event.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
            </div>
            {event.competition_type === 'blog' && (
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>Min {event.min_words} words</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{event.submission_count} submissions</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminLink to={`/admin/events/${event.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </AdminLink>
            <AdminLink to={`/admin/events/${event.id}/submissions`}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                Submissions
              </Button>
            </AdminLink>
            <a 
              href={event.competition_type === 'reel' ? `/reels/${event.slug}` : `/events/${event.slug}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                View Public
              </Button>
            </a>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => toggleEventStatus(event)}
            >
              {event.status === 'active' ? (
                <>
                  <XCircle className="w-4 h-4 mr-1" />
                  Close
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Reopen
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event Permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the event 
                    "{event.title}" and all {event.submission_count} associated submissions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteEvent(event.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {isAdminSubdomain() ? (
            <AdminLink to="/admin/dashboard">
              <Logo />
            </AdminLink>
          ) : (
            <Link to="/">
              <Logo />
            </Link>
          )}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              propscholars@gmail.com
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Reward System Quick Links */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-6 gap-4">
            <AdminLink to="/admin/rewards">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-yellow-400" />
                    Reward Settings
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/coupons">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-purple-400" />
                    Coupon Management
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/users-coins">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    User Coins
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/claims">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-400" />
                    Reward Claims
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/winner-claims">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Winner Claims
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/social-follows">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    Social Screenshots
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/votes">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-pink-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-pink-400" />
                    Blog Votes
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/add-votes">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-orange-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-400" />
                    Add Manual Votes
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/seo">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-green-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    SEO Management
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/emails">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-cyan-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Email Logs
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/notifications">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Send Notifications
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/analytics">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-emerald-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    User Analytics
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/referrals">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-indigo-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    Referral Logs
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/tickets">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-cyan-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Support Tickets
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/reviews">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Ticket Reviews
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/ai-knowledge">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-purple-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Train AI
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/canned-messages">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-teal-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-400" />
                    Canned Messages
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/ai-usage">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-cyan-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    AI Usage
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
            <AdminLink to="/admin/scholar-hub">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    Scholar Hub
                  </CardDescription>
                </CardHeader>
              </Card>
            </AdminLink>
          </div>

        <Tabs defaultValue="blog" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="blog" className="gap-2">
                <PenTool className="w-4 h-4" />
                Blog ({blogEvents.length})
              </TabsTrigger>
              <TabsTrigger value="reel" className="gap-2">
                <Video className="w-4 h-4" />
                Reels ({reelEvents.length})
              </TabsTrigger>
            </TabsList>
            
            <Link to="/admin/events/new">
              <Button variant="default">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>

          {/* Blog Tab */}
          <TabsContent value="blog" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-blue-400" />
                    Blog Events
                  </CardDescription>
                  <CardTitle className="text-3xl">{blogEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Blog Contests</CardDescription>
                  <CardTitle className="text-3xl text-success">{activeBlogEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Blog Submissions</CardDescription>
                  <CardTitle className="text-3xl text-primary">{totalBlogSubmissions}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Blog Events List */}
            <div className="space-y-4">
              {blogEvents.map(renderEventCard)}

              {blogEvents.length === 0 && (
                <Card className="p-12 text-center">
                  <PenTool className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Blog Events Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first blog writing event to get started.</p>
                  <Link to="/admin/events/new">
                    <Button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    Reel Events
                  </CardDescription>
                  <CardTitle className="text-3xl">{reelEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Reel Contests</CardDescription>
                  <CardTitle className="text-3xl text-success">{activeReelEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Reel Submissions</CardDescription>
                  <CardTitle className="text-3xl text-purple-400">{totalReelSubmissions}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Reel Events List */}
            <div className="space-y-4">
              {reelEvents.map(renderEventCard)}

              {reelEvents.length === 0 && (
                <Card className="p-12 text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Reel Events Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first reel making event to get started.</p>
                  <Link to="/admin/events/new">
                    <Button className="bg-purple-500 hover:bg-purple-600">
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
