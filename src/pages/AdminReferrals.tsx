import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isAdminSubdomain } from '@/hooks/useAdminSubdomain';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Coins, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReferralLog {
  id: string;
  referrer_id: string;
  referred_id: string;
  referred_email: string;
  status: string;
  coins_rewarded: number | null;
  created_at: string;
  rewarded_at: string | null;
  referrer_email?: string;
}

export default function AdminReferrals() {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<ReferralLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(isAdminSubdomain() ? '/' : '/admin');
      return;
    }
    fetchReferrals();
  }, [isLoggedIn, navigate]);

  const fetchReferrals = async () => {
    try {
      // First get all referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      // Get all user emails for referrer lookup
      const { data: usersData, error: usersError } = await supabase
        .from('user_coins')
        .select('user_id, email');

      if (usersError) throw usersError;

      // Create a map of user_id to email
      const userEmailMap = new Map(usersData?.map(u => [u.user_id, u.email]) || []);

      // Combine referrals with referrer emails
      const referralsWithEmails = (referralsData || []).map(ref => ({
        ...ref,
        referrer_email: userEmailMap.get(ref.referrer_id) || 'Unknown'
      }));

      setReferrals(referralsWithEmails);
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredReferrals = referrals.filter(ref => 
    ref.referrer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referred_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReferrals = referrals.length;
  const rewardedReferrals = referrals.filter(r => r.status === 'rewarded').length;
  const totalCoinsRewarded = referrals.reduce((sum, r) => sum + (r.coins_rewarded || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rewarded':
        return <Badge className="bg-success/20 text-success border-success/30">Rewarded</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/admin/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Referral Logs</h1>
          <p className="text-muted-foreground">Track who referred whom with names and emails</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Total Referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalReferrals}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                Rewarded Referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{rewardedReferrals}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                Total Coins Rewarded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-400">{totalCoinsRewarded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by referrer or referred email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Referral History</CardTitle>
            <CardDescription>Complete list of all referrals in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReferrals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No referrals match your search' : 'No referrals yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer (Who Referred)</TableHead>
                      <TableHead>Referred User (Who Joined)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Coins Rewarded</TableHead>
                      <TableHead>Referred At</TableHead>
                      <TableHead>Rewarded At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferrals.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell>
                          <div className="font-medium">{ref.referrer_email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ref.referred_email}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(ref.status)}</TableCell>
                        <TableCell>
                          <span className="text-yellow-400 font-medium">
                            {ref.coins_rewarded || 0} 🪙
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(ref.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          {ref.rewarded_at 
                            ? format(new Date(ref.rewarded_at), 'MMM d, yyyy h:mm a')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
