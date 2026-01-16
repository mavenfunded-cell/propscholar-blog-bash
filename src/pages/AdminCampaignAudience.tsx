import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, Plus, Upload, Download, Search, Tag, Trash2,
  Mail, UserMinus, ArrowLeft, Filter, Copy, CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

interface AudienceUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tags: string[];
  is_marketing_allowed: boolean;
  unsubscribed_at: string | null;
  source: string;
  total_opens: number;
  total_clicks: number;
  created_at: string;
}

interface AudienceTag {
  id: string;
  name: string;
  color: string;
}

interface BulkImportResult {
  total: number;
  added: number;
  duplicates: number;
  invalid: number;
}

export default function AdminCampaignAudience() {
  const { adminNavigate, getLoginPath, getDashboardPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading, email } = useAdminAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [newUser, setNewUser] = useState({ email: '', first_name: '', last_name: '' });
  const [newTag, setNewTag] = useState({ name: '', color: '#6366F1' });
  const [filterTag, setFilterTag] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      setHasAccess(false);
      adminNavigate(getLoginPath());
      return;
    }

    if (!email) {
      setHasAccess(false);
      adminNavigate(getLoginPath());
      return;
    }

    const checkCampaignAccess = async () => {
      const { data: accessData, error } = await supabase
        .from('admin_campaign_access')
        .select('has_access')
        .eq('admin_email', email)
        .eq('has_access', true)
        .maybeSingle();

      if (error) {
        setHasAccess(false);
        adminNavigate(getDashboardPath());
        return;
      }

      const ok = !!accessData;
      setHasAccess(ok);
      if (!ok) adminNavigate(getDashboardPath());
    };

    checkCampaignAccess();
  }, [adminNavigate, authLoading, email, getDashboardPath, getLoginPath, isLoggedIn]);


  const { data: users, isLoading } = useQuery({
    queryKey: ['audience-users', search, filterTag],
    queryFn: async () => {
      let query = supabase
        .from('audience_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      if (filterTag) {
        query = query.contains('tags', [filterTag]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AudienceUser[];
    },
    enabled: hasAccess === true,
  });

  const { data: tags } = useQuery({
    queryKey: ['audience-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as AudienceTag[];
    },
    enabled: hasAccess === true,
  });

  const addUserMutation = useMutation({
    mutationFn: async (user: typeof newUser) => {
      const emailToAdd = user.email.toLowerCase().trim();
      
      // Check if email already exists
      const { data: existing } = await supabase
        .from('audience_users')
        .select('id')
        .eq('email', emailToAdd)
        .maybeSingle();
      
      if (existing) {
        throw new Error('This email already exists in your audience');
      }
      
      const { error } = await supabase
        .from('audience_users')
        .insert({
          email: emailToAdd,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          source: 'manual',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      setAddDialogOpen(false);
      setNewUser({ email: '', first_name: '', last_name: '' });
      toast.success('User added to audience');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add user');
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (tag: typeof newTag) => {
      const { error } = await supabase
        .from('audience_tags')
        .insert(tag);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-tags'] });
      setTagDialogOpen(false);
      setNewTag({ name: '', color: '#6366F1' });
      toast.success('Tag created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create tag');
    },
  });

  const deleteUsersMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('audience_users')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      setSelectedUsers([]);
      toast.success('Users deleted');
    },
  });

  // Helper to extract and validate emails
  const extractEmails = (text: string): { valid: string[]; invalid: number } => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allMatches = text.match(emailRegex) || [];
    const uniqueEmails = [...new Set(allMatches.map(e => e.toLowerCase().trim()))];
    const lines = text.split(/[\n,;]+/).filter(l => l.trim());
    const invalidCount = lines.filter(l => l.trim() && !l.match(emailRegex)).length;
    return { valid: uniqueEmails, invalid: invalidCount };
  };

  // Bulk email import handler
  const handleBulkImport = async () => {
    if (!bulkEmails.trim()) {
      toast.error('Please enter some emails');
      return;
    }

    setBulkImporting(true);
    setBulkResult(null);

    try {
      const { valid: validEmails, invalid: invalidCount } = extractEmails(bulkEmails);
      
      if (validEmails.length === 0) {
        toast.error('No valid emails found');
        setBulkImporting(false);
        return;
      }

      // Check for existing emails in database
      const { data: existingUsers } = await supabase
        .from('audience_users')
        .select('email')
        .in('email', validEmails);

      const existingEmails = new Set(existingUsers?.map(u => u.email.toLowerCase()) || []);
      const duplicateCount = validEmails.filter(e => existingEmails.has(e)).length;
      const newEmails = validEmails.filter(e => !existingEmails.has(e));

      // Insert only new emails
      if (newEmails.length > 0) {
        const usersToInsert = newEmails.map(email => ({
          email,
          source: 'bulk_import',
          is_marketing_allowed: true,
        }));

        const { error } = await supabase
          .from('audience_users')
          .insert(usersToInsert);

        if (error) throw error;
      }

      setBulkResult({
        total: validEmails.length,
        added: newEmails.length,
        duplicates: duplicateCount,
        invalid: invalidCount,
      });

      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      toast.success(`Added ${newEmails.length} new emails`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import emails');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkImporting(true);
    setBulkResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const emailIndex = headers.findIndex(h => h === 'email');
      const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname');
      const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname');

      if (emailIndex === -1) {
        toast.error('CSV must have an "email" column');
        setBulkImporting(false);
        return;
      }

      const usersToImport: { email: string; first_name: string | null; last_name: string | null; source: string }[] = [];
      const seenEmails = new Set<string>();
      let invalidCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const email = values[emailIndex]?.toLowerCase().trim();
        
        if (email && email.includes('@') && !seenEmails.has(email)) {
          seenEmails.add(email);
          usersToImport.push({
            email,
            first_name: firstNameIndex >= 0 ? values[firstNameIndex] || null : null,
            last_name: lastNameIndex >= 0 ? values[lastNameIndex] || null : null,
            source: 'csv_import',
          });
        } else if (values[emailIndex]?.trim()) {
          invalidCount++;
        }
      }

      const duplicatesInFile = lines.length - 1 - usersToImport.length - invalidCount;

      if (usersToImport.length === 0) {
        toast.error('No valid emails found in CSV');
        setBulkImporting(false);
        return;
      }

      // Check for existing emails in database
      const { data: existingUsers } = await supabase
        .from('audience_users')
        .select('email')
        .in('email', usersToImport.map(u => u.email));

      const existingEmails = new Set(existingUsers?.map(u => u.email.toLowerCase()) || []);
      const duplicatesInDb = usersToImport.filter(u => existingEmails.has(u.email)).length;
      const newUsers = usersToImport.filter(u => !existingEmails.has(u.email));

      if (newUsers.length > 0) {
        const { error } = await supabase
          .from('audience_users')
          .insert(newUsers);

        if (error) throw error;
      }

      setBulkDialogOpen(true);
      setBulkResult({
        total: usersToImport.length,
        added: newUsers.length,
        duplicates: duplicatesInDb + duplicatesInFile,
        invalid: invalidCount,
      });

      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      toast.success(`Added ${newUsers.length} new contacts`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import CSV');
    } finally {
      setBulkImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (!users) return;
    
    const csv = [
      'email,first_name,last_name,subscribed,source,opens,clicks',
      ...users.map(u => 
        `${u.email},${u.first_name || ''},${u.last_name || ''},${u.is_marketing_allowed},${u.source},${u.total_opens},${u.total_clicks}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audience-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users?.map(u => u.id) || []);
    }
  };

  const activeCount = users?.filter(u => u.is_marketing_allowed && !u.unsubscribed_at).length || 0;
  const unsubscribedCount = users?.filter(u => u.unsubscribed_at).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => adminNavigate('/admin/campaigns')}
              className="rounded-full hover:bg-muted/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold tracking-tight">Audience Manager</h1>
              <p className="text-sm text-muted-foreground">
                Manage your marketing contacts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{users?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Active Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10">
                  <UserMinus className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{unsubscribedCount}</p>
                  <p className="text-xs text-muted-foreground">Unsubscribed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by email or name..." 
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setFilterTag(null)}>
                      All contacts
                    </DropdownMenuItem>
                    {tags?.map(tag => (
                      <DropdownMenuItem key={tag.id} onClick={() => setFilterTag(tag.id)}>
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                {selectedUsers.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteUsersMutation.mutate(selectedUsers)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedUsers.length})
                  </Button>
                )}

                <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Tag className="w-4 h-4 mr-2" />
                      Tags
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Tags</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {tags?.map(tag => (
                          <Badge 
                            key={tag.id} 
                            style={{ backgroundColor: tag.color }}
                            className="text-white"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="grid gap-3">
                        <Label>New Tag</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Tag name"
                            value={newTag.name}
                            onChange={(e) => setNewTag(p => ({ ...p, name: e.target.value }))}
                          />
                          <Input 
                            type="color"
                            className="w-14"
                            value={newTag.color}
                            onChange={(e) => setNewTag(p => ({ ...p, color: e.target.value }))}
                          />
                          <Button onClick={() => addTagMutation.mutate(newTag)}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleCSVImport}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>

                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add User to Audience</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div>
                        <Label>Email *</Label>
                        <Input 
                          type="email"
                          placeholder="user@example.com"
                          value={newUser.email}
                          onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <Input 
                            placeholder="John"
                            value={newUser.first_name}
                            onChange={(e) => setNewUser(p => ({ ...p, first_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <Input 
                            placeholder="Doe"
                            value={newUser.last_name}
                            onChange={(e) => setNewUser(p => ({ ...p, last_name: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button onClick={() => addUserMutation.mutate(newUser)}>
                        Add to Audience
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Bulk Import Dialog */}
                <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
                  setBulkDialogOpen(open);
                  if (!open) {
                    setBulkEmails('');
                    setBulkResult(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Bulk Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Email Import</DialogTitle>
                      <DialogDescription>
                        Paste a list of emails. They can be separated by commas, new lines, or semicolons. Duplicates will be automatically filtered.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!bulkResult ? (
                      <div className="space-y-4">
                        <Textarea 
                          placeholder="john@example.com&#10;jane@example.com&#10;bob@example.com"
                          value={bulkEmails}
                          onChange={(e) => setBulkEmails(e.target.value)}
                          className="min-h-[200px] font-mono text-sm"
                        />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            {extractEmails(bulkEmails).valid.length} valid emails detected
                          </span>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={handleBulkImport} 
                            disabled={bulkImporting || !bulkEmails.trim()}
                          >
                            {bulkImporting ? (
                              <>Processing...</>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Import Emails
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="text-center py-4">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                          <h3 className="text-lg font-semibold">Import Complete!</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Card className="border-green-500/30 bg-green-500/10">
                            <CardContent className="p-4 text-center">
                              <p className="text-3xl font-bold text-green-400">{bulkResult.added}</p>
                              <p className="text-sm text-muted-foreground">New emails added</p>
                            </CardContent>
                          </Card>
                          <Card className="border-amber-500/30 bg-amber-500/10">
                            <CardContent className="p-4 text-center">
                              <p className="text-3xl font-bold text-amber-400">{bulkResult.duplicates}</p>
                              <p className="text-sm text-muted-foreground">Duplicates skipped</p>
                            </CardContent>
                          </Card>
                        </div>

                        {bulkResult.invalid > 0 && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span>{bulkResult.invalid} invalid entries were skipped</span>
                          </div>
                        )}

                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-4">
                            Total processed: {bulkResult.total} emails
                          </p>
                          <Button onClick={() => {
                            setBulkDialogOpen(false);
                            setBulkEmails('');
                            setBulkResult(null);
                          }}>
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedUsers.length === users?.length && users.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(p => [...p, user.id]);
                          } else {
                            setSelectedUsers(p => p.filter(id => id !== user.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.first_name || user.last_name 
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {user.unsubscribed_at ? (
                        <Badge variant="destructive">Unsubscribed</Badge>
                      ) : user.is_marketing_allowed ? (
                        <Badge className="bg-green-500/20 text-green-400">Subscribed</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.total_opens} opens · {user.total_clicks} clicks
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users?.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No contacts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add users manually or import from CSV
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
