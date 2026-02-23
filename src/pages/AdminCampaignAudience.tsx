import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import * as XLSX from 'xlsx';
import {
  Users, Plus, Upload, Download, Search, Trash2,
  Mail, UserMinus, ArrowLeft, Copy, CheckCircle, AlertCircle, UserPlus, X, FolderPlus, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  const [activeGroup, setActiveGroup] = useState<string | null>(null); // null = All
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);
  const [newUser, setNewUser] = useState({ email: '', first_name: '', last_name: '' });
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366F1');
  const [assignGroupOpen, setAssignGroupOpen] = useState(false);
  const [selectedGroupForAssign, setSelectedGroupForAssign] = useState('');
  const [bulkImportTag, setBulkImportTag] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !email) {
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
      if (error) { setHasAccess(false); adminNavigate(getDashboardPath()); return; }
      const ok = !!accessData;
      setHasAccess(ok);
      if (!ok) adminNavigate(getDashboardPath());
    };
    checkCampaignAccess();
  }, [adminNavigate, authLoading, email, getDashboardPath, getLoginPath, isLoggedIn]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['audience-users', search, activeGroup],
    queryFn: async () => {
      let query = supabase
        .from('audience_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (search) {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }
      if (activeGroup) {
        // Show all contacts in this group regardless of merged status
        query = query.contains('tags', [activeGroup]);
      } else {
        // "All Contacts" only shows merged contacts
        query = query.eq('merged', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as AudienceUser[];
    },
    enabled: hasAccess === true,
  });

  const { data: allUsersCount } = useQuery({
    queryKey: ['audience-total-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('audience_users')
        .select('*', { count: 'exact', head: true })
        .eq('merged', true);
      if (error) throw error;
      return count || 0;
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

  // Get count per group
  const { data: groupCounts } = useQuery({
    queryKey: ['audience-group-counts', tags],
    queryFn: async () => {
      if (!tags) return {};
      const counts: Record<string, number> = {};
      for (const tag of tags) {
        const { count } = await supabase
          .from('audience_users')
          .select('*', { count: 'exact', head: true })
          .contains('tags', [tag.id]);
        counts[tag.id] = count || 0;
      }
      return counts;
    },
    enabled: hasAccess === true && !!tags,
  });

  // Mutations
  const addUserMutation = useMutation({
    mutationFn: async (user: typeof newUser) => {
      const emailToAdd = user.email.toLowerCase().trim();
      const { data: existing } = await supabase
        .from('audience_users')
        .select('id')
        .eq('email', emailToAdd)
        .maybeSingle();
      if (existing) throw new Error('This email already exists');
      const tagsToAssign = activeGroup ? [activeGroup] : [];
      const isMerged = !activeGroup; // Only merged if added directly to "All"
      const { error } = await supabase
        .from('audience_users')
        .insert({
          email: emailToAdd,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          source: 'manual',
          tags: tagsToAssign,
          merged: isMerged,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      queryClient.invalidateQueries({ queryKey: ['audience-total-count'] });
      setAddDialogOpen(false);
      setNewUser({ email: '', first_name: '', last_name: '' });
      toast.success('Contact added');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to add'),
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('audience_tags')
        .insert({ name: newGroupName.trim(), color: newGroupColor });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-tags'] });
      setCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupColor('#6366F1');
      toast.success('Group created');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create group'),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { data: usersWithTag } = await supabase
        .from('audience_users')
        .select('id, tags')
        .contains('tags', [tagId]);
      for (const user of usersWithTag || []) {
        const newTags = (user.tags || []).filter((t: string) => t !== tagId);
        await supabase.from('audience_users').update({ tags: newTags }).eq('id', user.id);
      }
      const { error } = await supabase.from('audience_tags').delete().eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-tags'] });
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      if (activeGroup) setActiveGroup(null);
      toast.success('Group deleted');
    },
  });

  const deleteUsersMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('audience_users').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      queryClient.invalidateQueries({ queryKey: ['audience-total-count'] });
      setSelectedUsers([]);
      toast.success('Contacts deleted');
    },
  });

  const assignToGroupMutation = useMutation({
    mutationFn: async ({ userIds, tagId }: { userIds: string[]; tagId: string }) => {
      const { data: usersData } = await supabase
        .from('audience_users')
        .select('id, tags')
        .in('id', userIds);
      for (const user of usersData || []) {
        const currentTags = user.tags || [];
        if (!currentTags.includes(tagId)) {
          await supabase.from('audience_users').update({ tags: [...currentTags, tagId] }).eq('id', user.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      setSelectedUsers([]);
      setAssignGroupOpen(false);
      setSelectedGroupForAssign('');
      toast.success('Added to group');
    },
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!activeGroup) return;
      const { data: usersData } = await supabase.from('audience_users').select('id, tags').in('id', userIds);
      for (const user of usersData || []) {
        const newTags = (user.tags || []).filter((t: string) => t !== activeGroup);
        await supabase.from('audience_users').update({ tags: newTags }).eq('id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      setSelectedUsers([]);
      toast.success('Removed from group');
    },
  });

  // Merge all unmerged contacts from the active group into "All"
  const mergeGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      // Get all unmerged users in this group
      const { data: unmergedUsers, error } = await supabase
        .from('audience_users')
        .select('id')
        .contains('tags', [groupId])
        .eq('merged', false);
      if (error) throw error;
      if (!unmergedUsers?.length) throw new Error('No unmerged contacts in this group');
      const ids = unmergedUsers.map(u => u.id);
      // Update in batches
      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        const { error: updateError } = await supabase
          .from('audience_users')
          .update({ merged: true })
          .in('id', batch);
        if (updateError) throw updateError;
      }
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-total-count'] });
      toast.success(`Merged ${count} contacts into All`);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to merge'),
  });

  // Count unmerged contacts in active group
  const { data: unmergedCount } = useQuery({
    queryKey: ['unmerged-count', activeGroup],
    queryFn: async () => {
      if (!activeGroup) return 0;
      const { count, error } = await supabase
        .from('audience_users')
        .select('*', { count: 'exact', head: true })
        .contains('tags', [activeGroup])
        .eq('merged', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: hasAccess === true && !!activeGroup,
  });

  // Bulk import helpers
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
      const tagToAssign = bulkImportTag && bulkImportTag !== 'none' ? bulkImportTag : (activeGroup || null);
      const isMerged = !tagToAssign; // Only merged if no group assigned
      if (newEmails.length > 0) {
        const usersToInsert = newEmails.map(email => ({
          email,
          source: 'bulk_import',
          is_marketing_allowed: true,
          tags: tagToAssign ? [tagToAssign] : [],
          merged: isMerged,
        }));
        for (const batch of chunkArray(usersToInsert, 500)) {
          await supabase.from('audience_users').upsert(batch, { onConflict: 'email', ignoreDuplicates: true });
        }
      }
      if (tagToAssign) {
        const existingEmailsList = validEmails.filter(e => existingEmails.has(e));
        if (existingEmailsList.length > 0) {
          for (const batch of chunkArray(existingEmailsList, 100)) {
            const { data: usersData } = await supabase.from('audience_users').select('id, tags').in('email', batch);
            for (const user of usersData || []) {
              const currentTags = user.tags || [];
              if (!currentTags.includes(tagToAssign)) {
                await supabase.from('audience_users').update({ tags: [...currentTags, tagToAssign] }).eq('id', user.id);
              }
            }
          }
        }
      }
      setBulkResult({ total: validEmails.length, added: newEmails.length, duplicates: duplicateCount, invalid: invalidCount });
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      queryClient.invalidateQueries({ queryKey: ['audience-total-count'] });
      toast.success(`Added ${newEmails.length} new emails`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import');
    } finally {
      setBulkImporting(false);
    }
  };

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
      const seenEmails = new Set<string>();

      if (ext === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => normalizeHeader(h));
        const emailIndex = headers.findIndex(h => h === 'email');
        const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname');
        const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname');
        const nameIndex = headers.findIndex(h => h === 'name' || h === 'full_name');
        if (emailIndex === -1) { toast.error('CSV must have an "email" column'); return; }
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
        toast.error('Unsupported file type'); return;
      }
      if (usersToImport.length === 0) { toast.error('No valid emails found'); return; }
      const existingEmails = await fetchExistingEmails(usersToImport.map(u => u.email));
      const newUsers = usersToImport.filter(u => !existingEmails.has(u.email));
      const tagToAssign = activeGroup || null;
      const isMerged = !tagToAssign;
      if (newUsers.length > 0) {
        const withTags = newUsers.map(u => ({ ...u, is_marketing_allowed: true, tags: tagToAssign ? [tagToAssign] : [], merged: isMerged }));
        for (const batch of chunkArray(withTags, 500)) {
          await supabase.from('audience_users').upsert(batch, { onConflict: 'email', ignoreDuplicates: true });
        }
      }
      if (tagToAssign) {
        const existingUserEmails = usersToImport.filter(u => existingEmails.has(u.email)).map(u => u.email);
        for (const batch of chunkArray(existingUserEmails, 100)) {
          const { data: usersData } = await supabase.from('audience_users').select('id, tags').in('email', batch);
          for (const user of usersData || []) {
            const currentTags = user.tags || [];
            if (!currentTags.includes(tagToAssign)) {
              await supabase.from('audience_users').update({ tags: [...currentTags, tagToAssign] }).eq('id', user.id);
            }
          }
        }
      }
      setBulkDialogOpen(true);
      setBulkResult({ total: usersToImport.length, added: newUsers.length, duplicates: existingEmails.size, invalid: invalidCount });
      queryClient.invalidateQueries({ queryKey: ['audience-users'] });
      queryClient.invalidateQueries({ queryKey: ['audience-group-counts'] });
      queryClient.invalidateQueries({ queryKey: ['audience-total-count'] });
      toast.success(`Added ${newUsers.length} new contacts`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import');
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
    if (selectedUsers.length === users?.length) setSelectedUsers([]);
    else setSelectedUsers(users?.map(u => u.id) || []);
  };

  const activeCount = users?.filter(u => u.is_marketing_allowed && !u.unsubscribed_at).length || 0;
  const activeGroupData = tags?.find(t => t.id === activeGroup);

  const groupColors = [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'
  ];

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
              <h1 className="text-xl font-semibold tracking-tight">Audience</h1>
              <p className="text-sm text-muted-foreground">
                {allUsersCount || 0} total contacts · {tags?.length || 0} groups
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* ── Sidebar: Groups ── */}
          <div className="w-56 shrink-0 space-y-2">
            {/* All Contacts */}
            <button
              onClick={() => { setActiveGroup(null); setSelectedUsers([]); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeGroup === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:bg-muted/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Contacts
              </span>
              <span className={`text-xs tabular-nums ${activeGroup === null ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {allUsersCount || 0}
              </span>
            </button>

            <div className="h-px bg-border/50 my-3" />

            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Groups</span>
              <button
                onClick={() => setCreateGroupOpen(true)}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Create group"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {tags?.length === 0 && (
              <div className="px-3 py-6 text-center">
                <FolderPlus className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No groups yet</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-xs h-7"
                  onClick={() => setCreateGroupOpen(true)}
                >
                  Create first group
                </Button>
              </div>
            )}

            {tags?.map(tag => (
              <button
                key={tag.id}
                onClick={() => { setActiveGroup(tag.id); setSelectedUsers([]); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group ${
                  activeGroup === tag.id
                    ? 'bg-muted/80 text-foreground font-medium'
                    : 'text-foreground/70 hover:bg-muted/30'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {groupCounts?.[tag.id] || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${tag.name}"? Contacts won't be deleted.`)) {
                        deleteGroupMutation.mutate(tag.id);
                      }
                    }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </button>
            ))}
          </div>

          {/* ── Main Content ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Active group header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {activeGroupData ? (
                    <>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeGroupData.color }} />
                      {activeGroupData.name}
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-muted-foreground" />
                      All Contacts
                    </>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {users?.length || 0} contacts · {activeCount} active
                  {activeGroup && unmergedCount ? ` · ${unmergedCount} unmerged` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeGroup && unmergedCount !== undefined && unmergedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                    onClick={() => mergeGroupMutation.mutate(activeGroup)}
                    disabled={mergeGroupMutation.isPending}
                  >
                    {mergeGroupMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Merge {unmergedCount} into All
                  </Button>
                )}
                {selectedUsers.length > 0 && (
                  <>
                    <Dialog open={assignGroupOpen} onOpenChange={setAssignGroupOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-lg border-border/50 gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" />
                          Add to Group ({selectedUsers.length})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-border/50">
                        <DialogHeader>
                          <DialogTitle>Add to Group</DialogTitle>
                          <DialogDescription>
                            Add {selectedUsers.length} contacts to a group
                          </DialogDescription>
                        </DialogHeader>
                        <Select value={selectedGroupForAssign} onValueChange={setSelectedGroupForAssign}>
                          <SelectTrigger><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                          <SelectContent>
                            {tags?.map(tag => (
                              <SelectItem key={tag.id} value={tag.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                  {tag.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <DialogFooter>
                          <Button
                            onClick={() => assignToGroupMutation.mutate({ userIds: selectedUsers, tagId: selectedGroupForAssign })}
                            disabled={!selectedGroupForAssign || assignToGroupMutation.isPending}
                            className="rounded-lg"
                          >
                            {assignToGroupMutation.isPending ? 'Adding...' : 'Add to Group'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {activeGroup && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-border/50 gap-1.5"
                        onClick={() => removeFromGroupMutation.mutate(selectedUsers)}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Remove ({selectedUsers.length})
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg gap-1.5"
                      onClick={() => {
                        if (confirm(`Delete ${selectedUsers.length} contacts permanently?`)) {
                          deleteUsersMutation.mutate(selectedUsers);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </>
                )}

                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileImport} />
                <Button variant="outline" size="sm" className="rounded-lg border-border/50" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Import
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg border-border/50" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                </Button>

                <Dialog open={bulkDialogOpen} onOpenChange={(open) => { setBulkDialogOpen(open); if (!open) { setBulkEmails(''); setBulkResult(null); setBulkImportTag(''); } }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-lg border-border/50">
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Bulk Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl border-border/50">
                    <DialogHeader>
                      <DialogTitle>Bulk Import</DialogTitle>
                      <DialogDescription>
                        Paste emails below. {activeGroupData ? `They'll be added to "${activeGroupData.name}".` : 'They\'ll be added to All Contacts.'}
                      </DialogDescription>
                    </DialogHeader>
                    {!bulkResult ? (
                      <div className="space-y-4">
                        {!activeGroup && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Assign to Group (optional)</Label>
                            <Select value={bulkImportTag} onValueChange={setBulkImportTag}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="No group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No group</SelectItem>
                                {tags?.map(tag => (
                                  <SelectItem key={tag.id} value={tag.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                      {tag.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Textarea
                          placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                          value={bulkEmails}
                          onChange={(e) => setBulkEmails(e.target.value)}
                          className="min-h-[160px] font-mono text-sm"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{extractEmails(bulkEmails).valid.length} valid emails</span>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkEmails.trim()} className="rounded-lg">
                            {bulkImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4 mr-2" /> Import</>}
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                          <p className="font-semibold">Import Complete</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-400">{bulkResult.added}</p>
                            <p className="text-xs text-muted-foreground">Added</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-center">
                            <p className="text-2xl font-bold text-muted-foreground">{bulkResult.duplicates}</p>
                            <p className="text-xs text-muted-foreground">Duplicates</p>
                          </div>
                        </div>
                        {bulkResult.invalid > 0 && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                            {bulkResult.invalid} invalid entries skipped
                          </div>
                        )}
                        <Button className="w-full rounded-lg" onClick={() => { setBulkDialogOpen(false); setBulkEmails(''); setBulkResult(null); }}>
                          Done
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-lg gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-border/50">
                    <DialogHeader>
                      <DialogTitle>Add Contact</DialogTitle>
                      {activeGroupData && (
                        <DialogDescription>Will be added to "{activeGroupData.name}"</DialogDescription>
                      )}
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div>
                        <Label className="text-xs">Email *</Label>
                        <Input type="email" placeholder="user@example.com" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">First Name</Label>
                          <Input placeholder="John" value={newUser.first_name} onChange={(e) => setNewUser(p => ({ ...p, first_name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Last Name</Label>
                          <Input placeholder="Doe" value={newUser.last_name} onChange={(e) => setNewUser(p => ({ ...p, last_name: e.target.value }))} className="mt-1" />
                        </div>
                      </div>
                      <Button onClick={() => addUserMutation.mutate(newUser)} disabled={!newUser.email.trim()} className="rounded-lg">
                        Add Contact
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9 rounded-lg border-border/50 bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Table */}
            <Card className="border-border/50 bg-card/50 overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : users?.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-medium mb-1">No contacts{activeGroupData ? ` in "${activeGroupData.name}"` : ''}</p>
                    <p className="text-sm text-muted-foreground">Add contacts or import from a file</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="w-10 px-3 py-3">
                          <Checkbox
                            checked={selectedUsers.length === users?.length && (users?.length || 0) > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3">Email</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3 hidden md:table-cell">Name</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3 hidden lg:table-cell">Groups</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3 w-[70px]">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3 hidden sm:table-cell w-[100px]">Engagement</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3 hidden xl:table-cell w-[70px]">Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map(user => (
                        <tr key={user.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedUsers(p => [...p, user.id]);
                                else setSelectedUsers(p => p.filter(id => id !== user.id));
                              }}
                            />
                          </td>
                          <td className="px-2 py-2.5 font-medium truncate max-w-[200px]">{user.email}</td>
                          <td className="px-2 py-2.5 text-muted-foreground hidden md:table-cell">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : <span className="text-muted-foreground/40">-</span>
                            }
                          </td>
                          <td className="px-2 py-2.5 hidden lg:table-cell">
                            {user.tags && user.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.tags.map(tagId => {
                                  const tag = tags?.find(t => t.id === tagId);
                                  return tag ? (
                                    <span
                                      key={tagId}
                                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            {user.unsubscribed_at ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive border border-destructive/30">Unsub</span>
                            ) : user.is_marketing_allowed ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Active</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">Off</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                            {user.total_opens}o · {user.total_clicks}c
                          </td>
                          <td className="px-2 py-2.5 text-xs text-muted-foreground hidden xl:table-cell">
                            {format(new Date(user.created_at), 'MMM d')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="max-w-sm border-border/50">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>Groups let you organize contacts and target campaigns</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Group Name</Label>
              <Input
                placeholder="e.g. VIP Traders, Newsletter"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2 mt-1.5">
                {groupColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewGroupColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${newGroupColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground/30 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={() => createGroupMutation.mutate()}
              disabled={!newGroupName.trim() || createGroupMutation.isPending}
              className="w-full rounded-lg"
            >
              {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
