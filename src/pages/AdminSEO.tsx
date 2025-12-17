import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Search, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Globe,
  FileText,
  Settings,
  ArrowLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SEOSetting {
  id: string;
  page_path: string;
  page_name: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
  updated_at: string;
}

export default function AdminSEO() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seoSettings, setSeoSettings] = useState<SEOSetting[]>([]);
  const [selectedSeo, setSelectedSeo] = useState<SEOSetting | null>(null);
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPage, setNewPage] = useState({ page_path: '', page_name: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndFetch();
    }
  }, [user]);

  const checkAdminAndFetch = async () => {
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchSEOSettings();
  };

  const fetchSEOSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_settings')
        .select('*')
        .order('page_name');

      if (error) throw error;
      setSeoSettings(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch SEO settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSEOSettings = async () => {
    if (!selectedSeo) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('seo_settings')
        .update({
          title: selectedSeo.title,
          description: selectedSeo.description,
          keywords: selectedSeo.keywords,
          og_title: selectedSeo.og_title,
          og_description: selectedSeo.og_description,
          og_image: selectedSeo.og_image,
          canonical_url: selectedSeo.canonical_url,
          robots: selectedSeo.robots
        })
        .eq('id', selectedSeo.id);

      if (error) throw error;
      toast.success('SEO settings saved!');
      fetchSEOSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addNewPage = async () => {
    if (!newPage.page_path || !newPage.page_name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('seo_settings')
        .insert({
          page_path: newPage.page_path,
          page_name: newPage.page_name
        });

      if (error) throw error;
      toast.success('Page added!');
      setAddDialogOpen(false);
      setNewPage({ page_path: '', page_name: '' });
      fetchSEOSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add page');
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page SEO settings?')) return;

    try {
      const { error } = await supabase
        .from('seo_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Page deleted!');
      if (selectedSeo?.id === id) setSelectedSeo(null);
      fetchSEOSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <Search className="w-6 h-6 md:w-8 md:h-8" />
                SEO Management
              </h1>
              <p className="text-sm text-muted-foreground">Manage meta tags and keywords for all pages</p>
            </div>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Page</DialogTitle>
                <DialogDescription>Add SEO settings for a new page</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Page Path</Label>
                  <Input 
                    placeholder="/example-page" 
                    value={newPage.page_path}
                    onChange={(e) => setNewPage({ ...newPage, page_path: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Page Name</Label>
                  <Input 
                    placeholder="Example Page" 
                    value={newPage.page_name}
                    onChange={(e) => setNewPage({ ...newPage, page_name: e.target.value })}
                  />
                </div>
                <Button onClick={addNewPage} className="w-full">Add Page</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pages List */}
          <Card className="p-4 bg-card/50 border-border/50 lg:col-span-1">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Pages ({seoSettings.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {seoSettings.map((seo) => (
                <div
                  key={seo.id}
                  onClick={() => setSelectedSeo(seo)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSeo?.id === seo.id 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'bg-background/50 border border-border/30 hover:bg-background/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{seo.page_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(seo.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{seo.page_path}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* SEO Editor */}
          <Card className="p-4 md:p-6 bg-card/50 border-border/50 lg:col-span-2">
            {selectedSeo ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Edit: {selectedSeo.page_name}
                  </h3>
                  <Button onClick={saveSEOSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Page Title</Label>
                    <Input
                      value={selectedSeo.title || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, title: e.target.value })}
                      placeholder="Page Title - PropScholar"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 50-60 characters</p>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Meta Description</Label>
                    <Textarea
                      value={selectedSeo.description || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, description: e.target.value })}
                      placeholder="A brief description of this page..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 150-160 characters ({selectedSeo.description?.length || 0})</p>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Keywords</Label>
                    <Textarea
                      value={selectedSeo.keywords || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3..."
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated keywords</p>
                  </div>

                  <div>
                    <Label>OG Title (Social)</Label>
                    <Input
                      value={selectedSeo.og_title || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, og_title: e.target.value })}
                      placeholder="Leave empty to use page title"
                    />
                  </div>

                  <div>
                    <Label>OG Image URL</Label>
                    <Input
                      value={selectedSeo.og_image || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, og_image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>OG Description (Social)</Label>
                    <Textarea
                      value={selectedSeo.og_description || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, og_description: e.target.value })}
                      placeholder="Leave empty to use meta description"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Canonical URL</Label>
                    <Input
                      value={selectedSeo.canonical_url || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, canonical_url: e.target.value })}
                      placeholder="https://propscholar.space/..."
                    />
                  </div>

                  <div>
                    <Label>Robots</Label>
                    <Input
                      value={selectedSeo.robots || ''}
                      onChange={(e) => setSelectedSeo({ ...selectedSeo, robots: e.target.value })}
                      placeholder="index, follow"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 rounded-lg bg-background/50 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">Google Preview</p>
                  <div className="text-blue-400 text-lg hover:underline cursor-pointer truncate">
                    {selectedSeo.title || 'Page Title'}
                  </div>
                  <div className="text-green-400 text-sm truncate">
                    {selectedSeo.canonical_url || `https://propscholar.space${selectedSeo.page_path}`}
                  </div>
                  <div className="text-muted-foreground text-sm line-clamp-2">
                    {selectedSeo.description || 'Meta description will appear here...'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a page to edit its SEO settings</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
