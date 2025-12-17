import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Search, Coins, Users, Eye, Gift, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UserCoin {
  id: string;
  user_id: string;
  email: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  referral_code: string;
  signup_coins_claimed: boolean;
  created_at: string;
}

interface CoinTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string;
  created_at: string;
}

interface RewardClaim {
  id: string;
  coins_spent: number;
  status: string;
  coupon_code: string | null;
  created_at: string;
  reward: {
    name: string;
  };
}

export default function AdminUserCoins() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserCoin[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserCoin | null>(null);
  const [userTransactions, setUserTransactions] = useState<CoinTransaction[]>([]);
  const [userClaims, setUserClaims] = useState<RewardClaim[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('user_coins')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUserDetails = async (userCoin: UserCoin) => {
    setSelectedUser(userCoin);
    setLoadingDetails(true);

    try {
      const { data: transactions } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userCoin.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      setUserTransactions(transactions || []);

      const { data: claims } = await supabase
        .from('reward_claims')
        .select('*, reward:rewards(name)')
        .eq('user_id', userCoin.user_id)
        .order('created_at', { ascending: false });

      setUserClaims((claims || []).map((c: any) => ({
        ...c,
        reward: c.reward
      })));
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.referral_code.toLowerCase().includes(search.toLowerCase())
  );

  const totalCoinsIssued = users.reduce((sum, u) => sum + u.total_earned, 0);
  const totalCoinsSpent = users.reduce((sum, u) => sum + u.total_spent, 0);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-foreground">User Coins</h1>
          <p className="text-muted-foreground">View and manage user coin balances</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {users.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Coins in Circulation</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                {users.reduce((sum, u) => sum + u.balance, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Issued</CardDescription>
              <CardTitle className="text-2xl text-green-400">{totalCoinsIssued}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Spent</CardDescription>
              <CardTitle className="text-2xl text-foreground">{totalCoinsSpent}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or referral code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>{filteredUsers.length} users found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredUsers.map(userCoin => (
                <div 
                  key={userCoin.id}
                  className="p-4 rounded-lg bg-background/50 border border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{userCoin.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {format(new Date(userCoin.created_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Referral: <code className="bg-muted px-1 rounded">{userCoin.referral_code}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">{userCoin.balance}</p>
                      <p className="text-xs text-muted-foreground">Balance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-400">{userCoin.total_earned}</p>
                      <p className="text-xs text-muted-foreground">Earned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">{userCoin.total_spent}</p>
                      <p className="text-xs text-muted-foreground">Spent</p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchUserDetails(userCoin)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{selectedUser?.email}</DialogTitle>
                          <DialogDescription>
                            User coin history and claims
                          </DialogDescription>
                        </DialogHeader>
                        
                        {loadingDetails ? (
                          <div className="py-8 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* User Stats */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                                <p className="text-2xl font-bold text-yellow-500">{selectedUser?.balance}</p>
                                <p className="text-xs text-muted-foreground">Balance</p>
                              </div>
                              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                                <p className="text-2xl font-bold text-green-400">{selectedUser?.total_earned}</p>
                                <p className="text-xs text-muted-foreground">Earned</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted text-center">
                                <p className="text-2xl font-bold text-foreground">{selectedUser?.total_spent}</p>
                                <p className="text-xs text-muted-foreground">Spent</p>
                              </div>
                            </div>

                            {/* Reward Claims */}
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Gift className="w-4 h-4" />
                                Reward Claims ({userClaims.length})
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {userClaims.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No rewards claimed</p>
                                ) : (
                                  userClaims.map(claim => (
                                    <div key={claim.id} className="p-2 rounded bg-background/50 border border-border/30 text-sm">
                                      <div className="flex items-center justify-between">
                                        <span>{claim.reward?.name}</span>
                                        <Badge variant="outline">{claim.status}</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(claim.created_at), 'MMM d, yyyy')} • -{claim.coins_spent} coins
                                      </p>
                                      {claim.coupon_code && (
                                        <code className="text-xs bg-muted px-1 rounded">{claim.coupon_code}</code>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Transaction History */}
                            <div>
                              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Transaction History ({userTransactions.length})
                              </h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {userTransactions.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No transactions</p>
                                ) : (
                                  userTransactions.map(tx => (
                                    <div key={tx.id} className="p-2 rounded bg-background/50 border border-border/30 text-sm flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">{tx.description || tx.source}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                                        </p>
                                      </div>
                                      <span className={`font-semibold ${tx.transaction_type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}