import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AdminLink } from '@/components/AdminLink';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { ArrowLeft, Star, TrendingUp, MessageSquare, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface TicketReview {
  id: string;
  ticket_id: string;
  user_email: string;
  rating: number;
  created_at: string;
  ticket?: {
    ticket_number: number;
    subject: string;
  };
}

export default function AdminTicketReviews() {
  const navigate = useNavigate();
  const { getLoginPath } = useAdminNavigation();
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
  const [reviews, setReviews] = useState<TicketReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(getLoginPath());
    }
  }, [isLoggedIn, navigate, getLoginPath]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchReviews();
    }
  }, [isLoggedIn]);

  const fetchReviews = async () => {
    try {
      // Use RPC function to bypass RLS
      const { data: reviewsData, error } = await supabase.rpc('get_all_ticket_reviews');

      if (error) throw error;
      
      // Fetch ticket details for each review
      const reviewsWithTickets = await Promise.all(
        (reviewsData || []).map(async (review: any) => {
          const { data: ticketData } = await supabase.rpc('get_ticket_details', {
            _ticket_id: review.ticket_id
          });
          return {
            ...review,
            ticket: ticketData?.[0] ? {
              ticket_number: ticketData[0].ticket_number,
              subject: ticketData[0].subject
            } : null
          };
        })
      );
      
      setReviews(reviewsWithTickets);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  // Calculate stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';
  const ratingCounts = [1, 2, 3, 4, 5].map(rating => 
    reviews.filter(r => r.rating === rating).length
  );
  const positiveRatio = totalReviews > 0 
    ? Math.round((reviews.filter(r => r.rating >= 4).length / totalReviews) * 100)
    : 0;

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(r => ratingFilter === 'all' || r.rating === parseInt(ratingFilter))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return 0;
    });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-success/20 text-success border-success/30';
    if (rating >= 3) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-destructive/20 text-destructive border-destructive/30';
  };

  if (loadingReviews) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AdminLink to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </AdminLink>
            <AdminLink to="/dashboard">
              <Logo />
            </AdminLink>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Support Ticket Reviews</h1>
          <p className="text-muted-foreground">Customer satisfaction ratings for closed support tickets</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Average Rating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{averageRating}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(parseFloat(averageRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Satisfaction Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-success">{positiveRatio}%</span>
                <span className="text-sm text-muted-foreground">positive (4-5 stars)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Total Reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{totalReviews}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rating Distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-4">{rating}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${totalReviews > 0 ? (ratingCounts[rating - 1] / totalReviews) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{ratingCounts[rating - 1]}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rating</SelectItem>
              <SelectItem value="lowest">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filter'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getRatingColor(review.rating)}>
                          {review.rating} Star{review.rating !== 1 ? 's' : ''}
                        </Badge>
                        {renderStars(review.rating)}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <AdminLink to={`/admin/tickets/${review.ticket_id}`}>
                          <span className="text-sm font-medium hover:text-primary transition-colors">
                            Ticket #{review.ticket?.ticket_number}: {review.ticket?.subject || 'Unknown'}
                          </span>
                        </AdminLink>
                        <span className="text-sm text-muted-foreground">{review.user_email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(review.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}