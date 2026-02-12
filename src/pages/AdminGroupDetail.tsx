import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Users, Plus, Upload, Download, Search, Trash2, Mail,
  ArrowLeft, CheckCircle, AlertCircle, Copy, Loader2, Send, X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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

interface BulkImportResult {
  total: number;
  added: number;
  duplicates: number;
  invalid: number;
}

export default function AdminGroupDetail() {
  const { groupId } = useParams();
  const { adminNavigate, getLoginPath, getDashboardPath } = useAdminNavigation();
  const { isLoggedIn, loading: authLoading, email } = useAdminAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [newUser, setNewUser] = useState({ email: '', first_name: '', last_name: '' });
  const [sendCampaignOpen, setSendCampaignOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !email) {
      setHasAccess(false);
      adminNavigate(getLoginPath());
      return;
    }
    const checkAccess = async () => {
      const { data } = await supabase
        .from('admin_campaign_access')
        .select('has_access')
        .eq('admin_email', email)
        .eq('has_access', true)
        .maybeSingle();
      const ok = !!data;
      setHasAccess(ok);
      if (!ok) adminNavigate(getDashboardPath());
    };
    checkAccess();
  }, [adminNavigate, authLoading, email, getDashboardPath, getLoginPath, isLoggedIn]);

  // Fetch group info
  const { data: group } = useQuery({
    queryKey: ['audience-tag', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_tags')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; color: string; description: string | null };
    },
    enabled: hasAccess === true && !!groupId,
  });

  // Fetch members of this group
  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', groupId, search],
    queryFn: async () => {
      let query = supabase
        .from('audience_users')
        .select('*')
        .contains('tags', [groupId!])
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AudienceUser[];
    },
    enabled: hasAccess === true && !!groupId,
  });

  const activeCount = members?.filter(u => u.is_marketing_allowed && !u.unsubscribed_at).length || 0;

  // Helper functions
  const extractEmails = (text: string): { valid: string[]; invalid: number } => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allMatches = text.match(emailRegex) || [];
    const uniqueEmails = [...new Set(allMatches.map(e => e.toLowerCase().trim()))];
    const lines = text.split(/[\n,;]+/).filter(l => l.trim());
    const invalidCount = lines.filter(l => l.trim() && !l.match(emailRegex)).length;
    return { valid: uniqueEmails, invalid: invalidCount };
  };

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  const fetchExistingEmails = async (emails: string[]) => {
    const existing = new Set<string>();
    for (const batch of chunkArray(emails, 500)) {
      const { data } = await supabase.from('audience_users').select('email').in('email', batch);
      (data || []).forEach(u => existing.add(String(u.email).toLowerCase()));
    }
    return existing;
  };

  // Add single user to group
  const addUserMutation = useMutation({
    mutationFn: async (user: typeof newUser) => {
      const emailToAdd = user.email.toLowerCase().trim();
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('audience_users')
        .select('id, tags')
        .eq('email', emailToAdd)
        .maybeSingle();
      
      if (existing) {
        // Add tag if not already present
        const currentTags = existing.tags || [];
        if (!currentTags.includes(groupId!)) {
          await supabase
            .from('audience_users')
            .update({ tags: [...currentTags, groupId!] })
            .eq('id', existing.id);
        }
      } else {
        await supabase.from('audience_users').insert({
          email: emailToAdd,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          source: 'manual',
          tags: [groupId!],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      setAddDialogOpen(false);
      setNewUser({ email: '', first_name: '', last_name: '' });
      toast.success('User added to group');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to add user'),
  });

  // Bulk import into this group
  const handleBulkImport = async () => {
    if (!bulkEmails.trim()) { toast.error('Please enter some emails'); return; }
    setBulkImporting(true);
    setBulkResult(null);

    try {
      const { valid: validEmails, invalid: invalidCount } = extractEmails(bulkEmails);
      if (validEmails.length === 0) { toast.error('No valid emails found'); setBulkImporting(false); return; }

      const existingEmails = await fetchExistingEmails(validEmails);
      const duplicateCount = validEmails.filter(e => existingEmails.has(e)).length;
      const newEmails = validEmails.filter(e => !existingEmails.has(e));

      // Insert new users with this group tag
      if (newEmails.length > 0) {
        const usersToInsert = newEmails.map(email => ({
          email,
          source: 'bulk_import',
          is_marketing_allowed: true,
          tags: [groupId!],
        }));
        for (const batch of chunkArray(usersToInsert, 500)) {
          await supabase.from('audience_users').upsert(batch, { onConflict: 'email', ignoreDuplicates: true });
        }
      }

      // Assign tag to existing users too
      const existingEmailsList = validEmails.filter(e => existingEmails.has(e));
      if (existingEmailsList.length > 0) {
        for (const batch of chunkArray(existingEmailsList, 100)) {
          const { data: usersData } = await supabase
            .from('audience_users')
            .select('id, tags')
            .in('email', batch);
          for (const user of usersData || []) {
            const currentTags = user.tags || [];
            if (!currentTags.includes(groupId!)) {
              await supabase.from('audience_users')
                .update({ tags: [...currentTags, groupId!] })
                .eq('id', user.id);
            }
          }
        }
      }

      setBulkResult({ total: validEmails.length, added: newEmails.length, duplicates: duplicateCount, invalid: invalidCount });
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success(`Added ${newEmails.length} new emails to group`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import');
    } finally {
      setBulkImporting(false);
    }
  };

  // File import (CSV/XLSX)
  const normalizeHeader = (h: string) => h.toLowerCase().trim().replace(/\s+/g, '_');
  const parseFullName = (name: string | null | undefined) => {
    const cleaned = (name || '').trim();
    if (!cleaned) return { first_name: null as string | null, last_name: null as string | null };
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { first_name: parts[0], last_name: null };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkImporting(true);
    setBulkResult(null);

    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let usersToImport: { email: string; first_name: string | null; last_name: string | null; source: string }[] = [];
      let invalidCount = 0;

      if (ext === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => normalizeHeader(h));
        const emailIndex = headers.findIndex(h => h === 'email');
        const nameIndex = headers.findIndex(h => h === 'name' || h === 'full_name');
        const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname');
        const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname');
        if (emailIndex === -1) { toast.error('CSV must have an "email" column'); return; }
        const seenEmails = new Set<string>();
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const email = values[emailIndex]?.toLowerCase().trim();
          if (email && email.includes('@') && !seenEmails.has(email)) {
            seenEmails.add(email);
            const parsedName = parseFullName(nameIndex >= 0 ? values[nameIndex] : null);
            usersToImport.push({
              email,
              first_name: firstNameIndex >= 0 ? (values[firstNameIndex] || null) : parsedName.first_name,
              last_name: lastNameIndex >= 0 ? (values[lastNameIndex] || null) : parsedName.last_name,
              source: 'csv_import',
            });
          } else if (values[emailIndex]?.trim()) invalidCount++;
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false }) as string[][];
        const headerRow = (rows[0] || []).map(h => normalizeHeader(String(h || '')));
        const emailIndex = headerRow.findIndex(h => h === 'email');
        const nameIndex = headerRow.findIndex(h => h === 'name' || h === 'full_name');
        const firstNameIndex = headerRow.findIndex(h => h === 'first_name' || h === 'firstname');
        const lastNameIndex = headerRow.findIndex(h => h === 'last_name' || h === 'lastname');
        if (emailIndex === -1) { toast.error('File must have an "Email" column'); return; }
        const seenEmails = new Set<string>();
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const email = String(row[emailIndex] || '').toLowerCase().trim();
          if (email && email.includes('@') && !seenEmails.has(email)) {
            seenEmails.add(email);
            const parsedName = parseFullName(nameIndex >= 0 ? String(row[nameIndex] || '') : '');
            usersToImport.push({
              email,
              first_name: firstNameIndex >= 0 ? (String(row[firstNameIndex] || '').trim() || null) : parsedName.first_name,
              last_name: lastNameIndex >= 0 ? (String(row[lastNameIndex] || '').trim() || null) : parsedName.last_name,
              source: 'xlsx_import',
            });
          } else if (String(row[emailIndex] || '').trim()) invalidCount++;
        }
      } else {
        toast.error('Unsupported file type');
        return;
      }

      if (usersToImport.length === 0) { toast.error('No valid emails found'); return; }

      const existingEmails = await fetchExistingEmails(usersToImport.map(u => u.email));
      const newUsers = usersToImport.filter(u => !existingEmails.has(u.email));
      const existingUserEmails = usersToImport.filter(u => existingEmails.has(u.email)).map(u => u.email);

      // Insert new users with group tag
      if (newUsers.length > 0) {
        const withTags = newUsers.map(u => ({ ...u, is_marketing_allowed: true, tags: [groupId!] }));
        for (const batch of chunkArray(withTags, 500)) {
          await supabase.from('audience_users').upsert(batch, { onConflict: 'email', ignoreDuplicates: true });
        }
      }

      // Assign tag to existing
      if (existingUserEmails.length > 0) {
        for (const batch of chunkArray(existingUserEmails, 100)) {
          const { data: usersData } = await supabase.from('audience_users').select('id, tags').in('email', batch);
          for (const user of usersData || []) {
            const currentTags = user.tags || [];
            if (!currentTags.includes(groupId!)) {
              await supabase.from('audience_users').update({ tags: [...currentTags, groupId!] }).eq('id', user.id);
            }
          }
        }
      }

      setBulkDialogOpen(true);
      setBulkResult({
        total: usersToImport.length,
        added: newUsers.length,
        duplicates: existingUserEmails.length,
        invalid: invalidCount,
      });
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success(`Added ${newUsers.length} new contacts to group`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import');
    } finally {
      setBulkImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove users from group (remove tag)
  const removeFromGroupMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { data: usersData } = await supabase.from('audience_users').select('id, tags').in('id', userIds);
      for (const user of usersData || []) {
        const newTags = (user.tags || []).filter((t: string) => t !== groupId);
        await supabase.from('audience_users').update({ tags: newTags }).eq('id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      setSelectedUsers([]);
      toast.success('Removed from group');
    },
  });

  // Export group members
  const handleExport = () => {
    if (!members) return;
    const csv = [
      'email,first_name,last_name,status,opens,clicks',
      ...members.map(u =>
        `${u.email},${u.first_name || ''},${u.last_name || ''},${u.is_marketing_allowed ? 'active' : 'inactive'},${u.total_opens},${u.total_clicks}`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `group-${group?.name || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Send campaign to this group
  const handleSendCampaign = async () => {
    // Create a new campaign pre-targeted to this group
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        name: `Campaign for ${group?.name || 'Group'}`,
        subject: '',
        html_content: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{subject}}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:#1a1a2e;color:#fff;padding:30px;text-align:center}.content{padding:30px}.footer{background:#f5f5f5;padding:20px;text-align:center;font-size:12px;color:#666}a{color:#6366f1}.btn{display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none}</style></head>
<body><div class="container"><div class="header"><h1>PropScholar</h1></div><div class="content"><p>Hi {{first_name}},</p><p>Your content goes here...</p><p><a href="#" class="btn">Call to Action</a></p></div><div class="footer"><p>You're receiving this because you subscribed to PropScholar updates.</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p></div></div></body></html>`,
        target_tags: [groupId!],
        sender_name: 'PropScholar',
        status: 'draft',
      }])
      .select()
      .single();

    if (error) {
      toast.error('Failed to create campaign');
      return;
    }

    toast.success('Campaign created for this group');
    adminNavigate(`/admin/campaigns/${data.id}/edit`);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === members?.length) setSelectedUsers([]);
    else setSelectedUsers(members?.map(u => u.id) || []);
  };

  if (!group && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => adminNavigate('/admin/campaigns/audience')}
              className="rounded-full hover:bg-muted/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              {group && (
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
              )}
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{group?.name || 'Loading...'}</h1>
                <p className="text-sm text-muted-foreground">
                  {members?.length || 0} members · {activeCount} active
                </p>
              </div>
            </div>
            <Button onClick={handleSendCampaign} className="gap-2">
              <Send className="w-4 h-4" />
              Send Campaign
            </Button>
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
                  <p className="text-2xl font-semibold tabular-nums">{members?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
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
                  <p className="text-xs text-muted-foreground">Active (Can Email)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{(members?.length || 0) - activeCount}</p>
                  <p className="text-xs text-muted-foreground">Unsubscribed / Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedUsers.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFromGroupMutation.mutate(selectedUsers)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove ({selectedUsers.length})
                  </Button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileImport}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={bulkImporting}>
                  <Upload className="w-4 h-4 mr-2" />
                  {bulkImporting ? 'Importing...' : 'Import File'}
                </Button>

                <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
                  setBulkDialogOpen(open);
                  if (!open) { setBulkEmails(''); setBulkResult(null); }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Bulk Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Import to {group?.name}</DialogTitle>
                      <DialogDescription>
                        Paste emails to add them directly to this group
                      </DialogDescription>
                    </DialogHeader>
                    {!bulkResult ? (
                      <div className="space-y-4">
                        <Textarea
                          placeholder={"email1@example.com\nemail2@example.com\nemail3@example.com"}
                          value={bulkEmails}
                          onChange={(e) => setBulkEmails(e.target.value)}
                          className="min-h-[180px] font-mono text-sm"
                        />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{extractEmails(bulkEmails).valid.length} valid emails detected</span>
                          <Badge style={{ backgroundColor: group?.color }} className="text-white">
                            → {group?.name}
                          </Badge>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkEmails.trim()}>
                            {bulkImporting ? 'Processing...' : (
                              <><Upload className="w-4 h-4 mr-2" />Import to Group</>
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
                              <p className="text-sm text-muted-foreground">Already existed</p>
                            </CardContent>
                          </Card>
                        </div>
                        {bulkResult.invalid > 0 && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span>{bulkResult.invalid} invalid entries skipped</span>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-4">Total processed: {bulkResult.total}</p>
                          <Button onClick={() => { setBulkDialogOpen(false); setBulkEmails(''); setBulkResult(null); }}>
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

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
                      <DialogTitle>Add User to {group?.name}</DialogTitle>
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
                      <Button onClick={() => addUserMutation.mutate(newUser)} disabled={!newUser.email}>
                        Add to Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === members?.length && (members?.length || 0) > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : members?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedUsers(p => [...p, user.id]);
                          else setSelectedUsers(p => p.filter(id => id !== user.id));
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {user.unsubscribed_at ? (
                        <Badge variant="destructive">Unsubscribed</Badge>
                      ) : user.is_marketing_allowed ? (
                        <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.total_opens} opens · {user.total_clicks} clicks
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.created_at), 'MMM d')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!isLoading && members?.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No members yet</h3>
                <p className="text-muted-foreground mb-4">
                  Import or add users to this group
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
