import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  Image as ImageIcon, 
  CheckCircle, 
  XCircle, 
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SocialFollow {
  id: string;
  user_id: string;
  platform: string;
  coins_earned: number;
  claimed_at: string;
  screenshot_url: string | null;
  status: string;
  user_email?: string;
}

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  discord: MessageCircle,
  youtube: Youtube,
};

export default function AdminSocialFollows() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [follows, setFollows] = useState<SocialFollow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchFollows();
    }
  }, [isAdmin]);

  const fetchFollows = async () => {
    try {
      // Fetch social follows with user info
      const { data: followsData } = await supabase
        .from('social_follows')
        .select('*')
        .order('claimed_at', { ascending: false });

      if (followsData) {
        // Get user emails
        const userIds = [...new Set(followsData.map(f => f.user_id))];
        const { data: usersData } = await supabase
          .from('user_coins')
          .select('user_id, email')
          .in('user_id', userIds);

        const userEmailMap: Record<string, string> = {};
        usersData?.forEach(u => {
          userEmailMap[u.user_id] = u.email;
        });

        setFollows(followsData.map(f => ({
          ...f,
          user_email: userEmailMap[f.user_id] || 'Unknown'
        })));
      }
    } catch (error) {
      console.error('Error fetching follows:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateStatus = async (followId: string, status: 'verified' | 'rejected', currentStatus?: string) => {
    setUpdating(followId);
    try {
      if (status === 'verified') {
        // Use the approve function which adds coins
        const { data, error } = await supabase.rpc('approve_social_follow', { _follow_id: followId });
        if (error) throw error;
        if (!data) {
          toast.error('Follow not found or already processed');
          return;
        }
        toast.success('Verified! Coins have been added to user account.');
      } else {
        // Use reject function which also handles coin deduction if was verified
        const { data, error } = await supabase.rpc('reject_social_follow', { _follow_id: followId });
        if (error) throw error;
        if (!data) {
          toast.error('Follow not found');
          return;
        }
        if (currentStatus === 'verified') {
          toast.success('Rejected! Coins have been revoked from user account.');
        } else {
          toast.success('Claim rejected');
        }
      }
      fetchFollows();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingFollows = follows.filter(f => f.status === 'pending');
  const verifiedFollows = follows.filter(f => f.status === 'verified');
  const rejectedFollows = follows.filter(f => f.status === 'rejected');

  const renderFollowsList = (list: SocialFollow[], showActions: boolean = false) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No social follows found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map(follow => {
          const Icon = platformIcons[follow.platform] || MessageCircle;
          return (
            <div 
              key={follow.id}
              className="p-4 rounded-lg bg-background/50 border border-border/30"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground capitalize">{follow.platform}</p>
                    <p className="text-sm text-muted-foreground">{follow.user_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(follow.claimed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(follow.status)}
                  <span className="text-sm text-yellow-500">+{follow.coins_earned} coins</span>
                  
                  {follow.screenshot_url ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ImageIcon className="w-4 h-4 mr-1" />
                          View Screenshot
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="capitalize flex items-center gap-2">
                            <Icon className="w-5 h-5" />
                            {follow.platform} Screenshot - {follow.user_email}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <img 
                            src={follow.screenshot_url} 
                            alt={`${follow.platform} follow screenshot`}
                            className="w-full rounded-lg border border-border/50"
                          />
                          <a 
                            href={follow.screenshot_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary flex items-center gap-1 hover:underline"
                          >
                            Open in new tab <ExternalLink className="w-3 h-3" />
                          </a>
                          
                          {showActions && follow.status !== 'rejected' && (
                            <div className="flex gap-2">
                              {follow.status === 'pending' && (
                                <Button 
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => updateStatus(follow.id, 'verified')}
                                  disabled={updating === follow.id}
                                >
                                  {updating === follow.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Verify
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button 
                                variant="destructive"
                                className="flex-1"
                                onClick={() => updateStatus(follow.id, 'rejected', follow.status)}
                                disabled={updating === follow.id}
                              >
                                {updating === follow.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-1" />
                                    {follow.status === 'verified' ? 'Revoke' : 'Reject'}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <span className="text-xs text-muted-foreground">No screenshot</span>
                  )}

                  {showActions && follow.status !== 'rejected' && (
                    <div className="flex gap-1">
                      {follow.status === 'pending' && (
                        <Button 
                          size="sm"
                          variant="ghost"
                          className="text-green-500"
                          onClick={() => updateStatus(follow.id, 'verified')}
                          disabled={updating === follow.id}
                        >
                          {updating === follow.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => updateStatus(follow.id, 'rejected', follow.status)}
                        disabled={updating === follow.id}
                      >
                        {updating === follow.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Logo />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Social Follow Claims</h1>
          <p className="text-muted-foreground">Review user social follow screenshots</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Claims</CardDescription>
              <CardTitle className="text-2xl">{follows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl text-yellow-400">{pendingFollows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verified</CardDescription>
              <CardTitle className="text-2xl text-green-400">{verifiedFollows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-2xl text-red-400">{rejectedFollows.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingFollows.length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedFollows.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedFollows.length})</TabsTrigger>
            <TabsTrigger value="all">All ({follows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  Pending Review
                </CardTitle>
                <CardDescription>Social follow claims waiting for verification</CardDescription>
              </CardHeader>
              <CardContent>
                {renderFollowsList(pendingFollows, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verified">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Verified Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderFollowsList(verifiedFollows, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  Rejected Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderFollowsList(rejectedFollows)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Social Follow Claims</CardTitle>
              </CardHeader>
              <CardContent>
                {renderFollowsList(follows, true)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
