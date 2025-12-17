import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Loader2, 
  Ticket, 
  Upload, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Ban
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

interface Coupon {
  id: string;
  coupon_code: string;
  reward_type: string;
  status: string;
  assigned_to: string | null;
  assigned_email: string | null;
  assigned_at: string | null;
  used_at: string | null;
  expires_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export default function AdminCoupons() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCoupons, setNewCoupons] = useState('');
  const [newType, setNewType] = useState<string>('discount_30');
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/space');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCoupons();
    }
  }, [isAdmin]);

  const fetchCoupons = async () => {
    try {
      const { data } = await supabase
        .from('coupon_pools')
        .select('*')
        .order('created_at', { ascending: false });

      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const addCoupons = async () => {
    if (!newCoupons.trim()) return;
    setAdding(true);

    try {
      const codes = newCoupons
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const newEntries = codes.map(code => ({
        coupon_code: code,
        reward_type: newType,
        status: 'unused'
      }));

      const { error } = await supabase
        .from('coupon_pools')
        .insert(newEntries);

      if (error) throw error;

      toast.success(`Added ${codes.length} coupons!`);
      setNewCoupons('');
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add coupons');
    } finally {
      setAdding(false);
    }
  };

  const revokeCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('coupon_pools')
        .update({ 
          status: 'revoked',
          revoke_reason: revokeReason || 'Revoked by admin'
        })
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Coupon revoked');
      setRevokeReason('');
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke coupon');
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('coupon_pools')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unused':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Clock className="w-3 h-3 mr-1" />Unused</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" />Assigned</Badge>;
      case 'used':
        return <Badge className="bg-muted text-muted-foreground"><CheckCircle className="w-3 h-3 mr-1" />Used</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Ban className="w-3 h-3 mr-1" />Revoked</Badge>;
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

  const discount30Coupons = coupons.filter(c => c.reward_type === 'discount_30');
  const discount50Coupons = coupons.filter(c => c.reward_type === 'discount_50');

  const stats = {
    total: coupons.length,
    unused: coupons.filter(c => c.status === 'unused').length,
    assigned: coupons.filter(c => c.status === 'assigned').length,
    used: coupons.filter(c => c.status === 'used').length,
  };

  const renderCouponList = (couponList: Coupon[]) => (
    <div className="space-y-2">
      {couponList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No coupons in this pool</p>
        </div>
      ) : (
        couponList.map(coupon => (
          <div 
            key={coupon.id} 
            className="p-4 rounded-lg bg-background/50 border border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{coupon.coupon_code}</code>
                {getStatusBadge(coupon.status)}
              </div>
              {coupon.assigned_email && (
                <p className="text-xs text-muted-foreground">
                  Assigned to: {coupon.assigned_email}
                </p>
              )}
              {coupon.assigned_at && (
                <p className="text-xs text-muted-foreground">
                  Assigned: {format(new Date(coupon.assigned_at), 'MMM d, yyyy')}
                </p>
              )}
              {coupon.expires_at && (
                <p className="text-xs text-muted-foreground">
                  Expires: {format(new Date(coupon.expires_at), 'MMM d, yyyy')}
                </p>
              )}
              {coupon.revoke_reason && (
                <p className="text-xs text-red-400">
                  Revoke reason: {coupon.revoke_reason}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {coupon.status === 'assigned' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-yellow-500">
                      <Ban className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke Coupon?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the coupon as revoked. The user will no longer be able to use it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label>Reason (optional)</Label>
                      <Input
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Reason for revocation"
                        className="mt-1"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revokeCoupon(coupon.id)}>
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {coupon.status === 'unused' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteCoupon(coupon.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/space/dashboard">
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
          <h1 className="text-3xl font-bold text-foreground">Coupon Management</h1>
          <p className="text-muted-foreground">Manage discount coupon pools</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Coupons</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-2xl text-green-400">{stats.unused}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assigned</CardDescription>
              <CardTitle className="text-2xl text-blue-400">{stats.assigned}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Used</CardDescription>
              <CardTitle className="text-2xl text-muted-foreground">{stats.used}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Add Coupons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Add Coupons
            </CardTitle>
            <CardDescription>Add new coupon codes (one per line)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Coupon Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount_30">30% Discount</SelectItem>
                    <SelectItem value="discount_50">50% Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Coupon Codes (one per line)</Label>
              <Textarea
                value={newCoupons}
                onChange={(e) => setNewCoupons(e.target.value)}
                placeholder="SAVE30-ABC123&#10;SAVE30-DEF456&#10;SAVE30-GHI789"
                rows={5}
                className="mt-1 font-mono"
              />
            </div>
            <Button onClick={addCoupons} disabled={adding || !newCoupons.trim()}>
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Coupons
            </Button>
          </CardContent>
        </Card>

        {/* Coupon Lists */}
        <Tabs defaultValue="30" className="space-y-4">
          <TabsList>
            <TabsTrigger value="30">30% Coupons ({discount30Coupons.length})</TabsTrigger>
            <TabsTrigger value="50">50% Coupons ({discount50Coupons.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="30">
            <Card>
              <CardHeader>
                <CardTitle>30% Discount Coupons</CardTitle>
                <CardDescription>
                  Available: {discount30Coupons.filter(c => c.status === 'unused').length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderCouponList(discount30Coupons)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="50">
            <Card>
              <CardHeader>
                <CardTitle>50% Discount Coupons</CardTitle>
                <CardDescription>
                  Available: {discount50Coupons.filter(c => c.status === 'unused').length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderCouponList(discount50Coupons)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}