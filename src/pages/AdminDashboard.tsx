import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  Trash2
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
}

interface EventWithCount extends Event {
  submission_count: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    }
  }, [isAdmin]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch submission counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          return {
            ...event,
            submission_count: count || 0
          };
        })
      );

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
    navigate('/admin');
  };

  const isEventExpired = (endDate: string) => new Date(endDate) < new Date();

  if (loading || loadingEvents) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const activeEvents = events.filter(e => e.status === 'active' && !isEventExpired(e.end_date));
  const totalSubmissions = events.reduce((sum, e) => sum + e.submission_count, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
              <CardTitle className="text-3xl">{events.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Events</CardDescription>
              <CardTitle className="text-3xl text-success">{activeEvents.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-3xl text-gold">{totalSubmissions}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-semibold">Events</h2>
          <Link to="/admin/events/new">
            <Button variant="gold">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.map((event) => (
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
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>Min {event.min_words} words</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{event.submission_count} submissions</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/events/${event.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={`/admin/events/${event.id}/submissions`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Submissions
                      </Button>
                    </Link>
                    <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer">
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
                    
                    {/* Delete Event Button */}
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
          ))}

          {events.length === 0 && (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first blog writing event to get started.</p>
              <Link to="/admin/events/new">
                <Button variant="gold">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
