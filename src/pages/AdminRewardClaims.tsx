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
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Gift, Award } from 'lucide-react';
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

interface RewardClaim {
  id: string;
  user_id: string;
  coins_spent: number;
  status: string;
  coupon_code: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  reward: {
    id: string;
    name: string;
    reward_type: string;
  };
  user_coins: {
    email: string;
  };
}

export default function AdminRewardClaims() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchClaims();
    }
  }, [isAdmin]);

  const fetchClaims = async () => {
    try {
      const { data } = await supabase
        .from('reward_claims')
        .select(`
          *,
          reward:rewards(id, name, reward_type),
          user_coins!inner(email)
        `)
        .order('created_at', { ascending: false });

      setClaims((data || []).map((c: any) => ({
        ...c,
        reward: c.reward,
        user_coins: c.user_coins
      })));
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateClaimStatus = async (claimId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'fulfilled') {
        updateData.fulfilled_at = new Date().toISOString();
      }
      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('reward_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      toast.success(`Claim ${status}`);
      setNotes('');
      fetchClaims();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update claim');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'fulfilled':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Fulfilled</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const propAccountClaims = claims.filter(c => c.reward?.reward_type === 'prop_account');
  const couponClaims = claims.filter(c => c.reward?.reward_type !== 'prop_account');

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
          <h1 className="text-3xl font-bold text-foreground">Reward Claims</h1>
          <p className="text-muted-foreground">Manage user reward claims</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Claims</CardDescription>
              <CardTitle className="text-2xl">{claims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl text-yellow-400">{pendingClaims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>$10K Accounts</CardDescription>
              <CardTitle className="text-2xl text-purple-400">{propAccountClaims.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Coupons</CardDescription>
              <CardTitle className="text-2xl text-blue-400">{couponClaims.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingClaims.length})</TabsTrigger>
            <TabsTrigger value="prop_account">$10K Accounts ({propAccountClaims.length})</TabsTrigger>
            <TabsTrigger value="all">All Claims ({claims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  Pending Claims
                </CardTitle>
                <CardDescription>Claims awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                {renderClaimList(pendingClaims, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prop_account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  PropScholar $10K Account Claims
                </CardTitle>
                <CardDescription>Manual fulfillment required</CardDescription>
              </CardHeader>
              <CardContent>
                {renderClaimList(propAccountClaims, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Claims</CardTitle>
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

  function renderClaimList(claimList: RewardClaim[], showActions: boolean) {
    if (claimList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
                  <h4 className="font-semibold text-foreground">{claim.reward?.name}</h4>
                  {getStatusBadge(claim.status)}
                </div>
                <p className="text-sm text-muted-foreground">{claim.user_coins?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Claimed: {format(new Date(claim.created_at), 'MMM d, yyyy h:mm a')}
                </p>
                <p className="text-xs text-yellow-500">Spent: {claim.coins_spent} coins</p>
                {claim.coupon_code && (
                  <p className="text-xs text-muted-foreground">
                    Coupon: <code className="bg-muted px-1 rounded">{claim.coupon_code}</code>
                  </p>
                )}
                {claim.notes && (
                  <p className="text-xs text-muted-foreground">Notes: {claim.notes}</p>
                )}
              </div>

              {showActions && claim.status === 'pending' && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-green-500">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Fulfill
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Fulfill Claim?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Mark this claim as fulfilled for {claim.user_coins?.email}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Label>Notes (optional)</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any notes about the fulfillment..."
                          className="mt-1"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => updateClaimStatus(claim.id, 'fulfilled')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Fulfill
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500">
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Claim?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reject the claim. Coins will NOT be refunded.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Label>Reason</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Reason for rejection..."
                          className="mt-1"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => updateClaimStatus(claim.id, 'rejected')}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
}