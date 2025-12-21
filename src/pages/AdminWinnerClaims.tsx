import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle, Clock, Trophy, Crown, Medal } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WinnerClaim {
  id: string;
  winner_type: string;
  event_id: string;
  submission_id: string;
  user_email: string;
  claim_name: string | null;
  claim_email: string | null;
  position: number;
  status: string;
  claimed_at: string | null;
  issued_at: string | null;
  admin_notes: string | null;
  created_at: string;
  event_title?: string;
}

export default function AdminWinnerClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<WinnerClaim[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notes, setNotes] = useState('');

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
    fetchClaims();
  }, [isLoggedIn, navigate]);

  const fetchClaims = async () => {
    try {
      const { data: claimsData } = await supabase.rpc('get_all_winner_claims');

      if (claimsData && claimsData.length > 0) {
        // Get event titles
        const eventIds = [...new Set(claimsData.map((c: any) => c.event_id))];
        const { data: events } = await supabase.rpc('get_all_events');

        const enrichedClaims = claimsData.map((claim: any) => ({
          ...claim,
          position: claim.claim_position, // Map from RPC result
          event_title: events?.find((e: any) => e.id === claim.event_id)?.title
        }));

        setClaims(enrichedClaims);
      } else {
        setClaims([]);
      }
    } catch (error) {
      console.error('Error fetching winner claims:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateClaimStatus = async (claimId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'issued') {
        updateData.issued_at = new Date().toISOString();
      }
      if (notes) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('winner_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      toast.success(`Claim marked as ${status}`);
      setNotes('');
      fetchClaims();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update claim');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unclaimed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />Unclaimed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'issued':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Issued</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <Trophy className="w-5 h-5 text-primary" />;
    }
  };

  const getPositionText = (position: number) => {
    switch (position) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${position}th Place`;
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const unclaimedClaims = claims.filter(c => c.status === 'unclaimed');
  const issuedClaims = claims.filter(c => c.status === 'issued');

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
          <h1 className="text-3xl font-bold text-foreground">Winner Claims</h1>
          <p className="text-muted-foreground">Manage competition winner reward claims</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Winners</CardDescription>
              <CardTitle className="text-2xl">{claims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl text-yellow-400">{pendingClaims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-gray-500/30">
            <CardHeader className="pb-2">
              <CardDescription>Unclaimed</CardDescription>
              <CardTitle className="text-2xl text-gray-400">{unclaimedClaims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardDescription>Issued</CardDescription>
              <CardTitle className="text-2xl text-green-400">{issuedClaims.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingClaims.length})</TabsTrigger>
            <TabsTrigger value="unclaimed">Unclaimed ({unclaimedClaims.length})</TabsTrigger>
            <TabsTrigger value="issued">Issued ({issuedClaims.length})</TabsTrigger>
            <TabsTrigger value="all">All ({claims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  Pending Claims
                </CardTitle>
                <CardDescription>Winners who have submitted their claim details</CardDescription>
              </CardHeader>
              <CardContent>
                {renderClaimList(pendingClaims, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unclaimed">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gray-400" />
                  Unclaimed Rewards
                </CardTitle>
                <CardDescription>Winners who haven't claimed their reward yet</CardDescription>
              </CardHeader>
              <CardContent>
                {renderClaimList(unclaimedClaims, false)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issued">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Issued Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderClaimList(issuedClaims, false)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Winner Claims</CardTitle>
              </CardHeader>
              <CardContent>
                {renderClaimList(claims, false)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );

  function renderClaimList(claimList: WinnerClaim[], showActions: boolean) {
    if (claimList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No claims found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {claimList.map(claim => (
          <div 
            key={claim.id}
            className="p-4 rounded-lg bg-background/50 border border-border/30"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getPositionIcon(claim.position)}
                  <h4 className="font-semibold text-foreground">{getPositionText(claim.position)}</h4>
                  {getStatusBadge(claim.status)}
                  <Badge variant="outline">{claim.winner_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{claim.event_title}</p>
                <p className="text-sm text-muted-foreground">Participant: {claim.user_email}</p>
                {claim.claim_name && (
                  <p className="text-sm text-foreground">
                    Claim Details: <span className="font-medium">{claim.claim_name}</span> - {claim.claim_email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Won: {format(new Date(claim.created_at), 'MMM d, yyyy')}
                  {claim.claimed_at && ` • Claimed: ${format(new Date(claim.claimed_at), 'MMM d, yyyy h:mm a')}`}
                  {claim.issued_at && ` • Issued: ${format(new Date(claim.issued_at), 'MMM d, yyyy h:mm a')}`}
                </p>
                {claim.admin_notes && (
                  <p className="text-xs text-muted-foreground">Notes: {claim.admin_notes}</p>
                )}
              </div>

              {showActions && claim.status === 'pending' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark as Issued
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as Issued?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the reward as issued for {claim.claim_name} ({claim.claim_email}).
                        The winner will see a green "Issued" status in their dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about the issuance..."
                        className="mt-1"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => updateClaimStatus(claim.id, 'issued')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark as Issued
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
}
