import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAdminNavigation } from '@/hooks/useAdminSubdomain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Globe,
  FileText,
  Settings,
  ArrowLeft,
  Map,
  Bot,
  ExternalLink,
  RefreshCw,
  Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

interface SitemapUrl {
  id: string;
  url: string;
  changefreq: string;
  priority: string;
}

export default function AdminSEO() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { getLoginPath, getDashboardPath } = useAdminNavigation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seoSettings, setSeoSettings] = useState<SEOSetting[]>([]);
  const [selectedSeo, setSelectedSeo] = useState<SEOSetting | null>(null);
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPage, setNewPage] = useState({ page_path: '', page_name: '' });
  
  // Sitemap & Robots state
  const [sitemapPreview, setSitemapPreview] = useState<string>('');
  const [loadingSitemap, setLoadingSitemap] = useState(false);
  const [robotsTxt, setRobotsTxt] = useState<string>('');
  const [savingRobots, setSavingRobots] = useState(false);
  
  // Sitemap URLs management
  const [sitemapUrls, setSitemapUrls] = useState<SitemapUrl[]>([]);
  const [addSitemapDialogOpen, setAddSitemapDialogOpen] = useState(false);
  const [newSitemapUrl, setNewSitemapUrl] = useState({ url: '', changefreq: 'weekly', priority: '0.8' });
  const [editingSitemapUrl, setEditingSitemapUrl] = useState<SitemapUrl | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(getLoginPath());
    }
  }, [user, authLoading, navigate, getLoginPath]);

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
      navigate(getLoginPath());
      return;
    }

    setIsAdmin(true);
    fetchSEOSettings();
    fetchRobotsTxt();
    fetchSitemapUrls();
  };

  const fetchSitemapUrls = async () => {
    try {
      const { data, error } = await supabase
        .from('sitemap_urls')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setSitemapUrls(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch sitemap URLs');
    }
  };

  const addSitemapUrl = async () => {
    if (!newSitemapUrl.url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const { error } = await supabase
        .from('sitemap_urls')
        .insert(newSitemapUrl);

      if (error) throw error;
      toast.success('URL added!');
      setAddSitemapDialogOpen(false);
      setNewSitemapUrl({ url: '', changefreq: 'weekly', priority: '0.8' });
      fetchSitemapUrls();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add URL');
    }
  };

  const updateSitemapUrl = async () => {
    if (!editingSitemapUrl) return;

    try {
      const { error } = await supabase
        .from('sitemap_urls')
        .update({
          url: editingSitemapUrl.url,
          changefreq: editingSitemapUrl.changefreq,
          priority: editingSitemapUrl.priority
        })
        .eq('id', editingSitemapUrl.id);

      if (error) throw error;
      toast.success('URL updated!');
      setEditingSitemapUrl(null);
      fetchSitemapUrls();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update URL');
    }
  };

  const deleteSitemapUrl = async (id: string) => {
    if (!confirm('Delete this URL from sitemap?')) return;

    try {
      const { error } = await supabase
        .from('sitemap_urls')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('URL deleted!');
      fetchSitemapUrls();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete URL');
    }
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

  const fetchRobotsTxt = async () => {
    try {
      const { data } = await supabase
        .from('reward_settings')
        .select('setting_value')
        .eq('setting_key', 'robots_txt')
        .maybeSingle();

      if (data?.setting_value && typeof data.setting_value === 'object' && 'content' in data.setting_value) {
        setRobotsTxt((data.setting_value as { content: string }).content || getDefaultRobots());
      } else {
        setRobotsTxt(getDefaultRobots());
      }
    } catch {
      setRobotsTxt(getDefaultRobots());
    }
  };

  const getDefaultRobots = () => `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://propscholar.space/sitemap.xml

# Disallow admin pages
Disallow: /admin/`;

  const fetchSitemapPreview = async () => {
    setLoadingSitemap(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`);
      const text = await response.text();
      setSitemapPreview(text);
    } catch (error) {
      toast.error('Failed to fetch sitemap preview');
    } finally {
      setLoadingSitemap(false);
    }
  };

  const saveRobotsTxt = async () => {
    setSavingRobots(true);
    try {
      const { data: existing } = await supabase
        .from('reward_settings')
        .select('id')
        .eq('setting_key', 'robots_txt')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('reward_settings')
          .update({ setting_value: { content: robotsTxt } })
          .eq('setting_key', 'robots_txt');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reward_settings')
          .insert({ setting_key: 'robots_txt', setting_value: { content: robotsTxt } });
        if (error) throw error;
      }

      toast.success('robots.txt saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save robots.txt');
    } finally {
      setSavingRobots(false);
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

  const copySitemapUrl = () => {
    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap`);
    toast.success('Sitemap URL copied!');
  };

  const copyRobotsUrl = () => {
    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robots`);
    toast.success('Robots URL copied!');
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
            <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardPath())}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <Search className="w-6 h-6 md:w-8 md:h-8" />
                SEO Management
              </h1>
              <p className="text-sm text-muted-foreground">Manage meta tags, sitemap, and robots.txt</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="pages" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Sitemap
            </TabsTrigger>
            <TabsTrigger value="robots" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Robots
            </TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="mt-6">
            <div className="flex justify-end mb-4">
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
          </TabsContent>

          {/* Sitemap Tab */}
          <TabsContent value="sitemap" className="mt-6 space-y-6">
            {/* Static Sitemap File Info */}
            <Card className="p-4 md:p-6 bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  Static Sitemap
                </h3>
                <Button size="sm" asChild>
                  <a href="https://propscholar.space/sitemap.xml" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live
                  </a>
                </Button>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <code className="text-sm text-primary">https://propscholar.space/sitemap.xml</code>
              </div>
            </Card>

            {/* Manage Sitemap URLs */}
            <Card className="p-4 md:p-6 bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Sitemap URLs ({sitemapUrls.length})
                </h3>
                <Dialog open={addSitemapDialogOpen} onOpenChange={setAddSitemapDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add URL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Sitemap URL</DialogTitle>
                      <DialogDescription>Add a new URL to sitemap.xml</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Full URL</Label>
                        <Input 
                          placeholder="https://propscholar.space/page" 
                          value={newSitemapUrl.url}
                          onChange={(e) => setNewSitemapUrl({ ...newSitemapUrl, url: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Change Frequency</Label>
                          <select 
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={newSitemapUrl.changefreq}
                            onChange={(e) => setNewSitemapUrl({ ...newSitemapUrl, changefreq: e.target.value })}
                          >
                            <option value="always">Always</option>
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="never">Never</option>
                          </select>
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <select 
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            value={newSitemapUrl.priority}
                            onChange={(e) => setNewSitemapUrl({ ...newSitemapUrl, priority: e.target.value })}
                          >
                            <option value="1.0">1.0 (Highest)</option>
                            <option value="0.9">0.9</option>
                            <option value="0.8">0.8</option>
                            <option value="0.7">0.7</option>
                            <option value="0.6">0.6</option>
                            <option value="0.5">0.5 (Default)</option>
                            <option value="0.4">0.4</option>
                            <option value="0.3">0.3</option>
                            <option value="0.2">0.2</option>
                            <option value="0.1">0.1 (Lowest)</option>
                          </select>
                        </div>
                      </div>
                      <Button onClick={addSitemapUrl} className="w-full">Add URL</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* URL List */}
              <div className="space-y-2">
                {sitemapUrls.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    {editingSitemapUrl?.id === item.id ? (
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 mr-2">
                        <Input 
                          className="md:col-span-2"
                          value={editingSitemapUrl.url}
                          onChange={(e) => setEditingSitemapUrl({ ...editingSitemapUrl, url: e.target.value })}
                        />
                        <select 
                          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                          value={editingSitemapUrl.changefreq}
                          onChange={(e) => setEditingSitemapUrl({ ...editingSitemapUrl, changefreq: e.target.value })}
                        >
                          <option value="always">Always</option>
                          <option value="hourly">Hourly</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                          <option value="never">Never</option>
                        </select>
                        <select 
                          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                          value={editingSitemapUrl.priority}
                          onChange={(e) => setEditingSitemapUrl({ ...editingSitemapUrl, priority: e.target.value })}
                        >
                          <option value="1.0">1.0</option>
                          <option value="0.9">0.9</option>
                          <option value="0.8">0.8</option>
                          <option value="0.7">0.7</option>
                          <option value="0.6">0.6</option>
                          <option value="0.5">0.5</option>
                          <option value="0.4">0.4</option>
                          <option value="0.3">0.3</option>
                          <option value="0.2">0.2</option>
                          <option value="0.1">0.1</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.changefreq} · Priority: {item.priority}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 ml-2">
                      {editingSitemapUrl?.id === item.id ? (
                        <>
                          <Button size="sm" onClick={updateSitemapUrl}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSitemapUrl(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSitemapUrl(item)}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSitemapUrl(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {sitemapUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No URLs added yet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Robots Tab */}
          <TabsContent value="robots" className="mt-6">
            <Card className="p-4 md:p-6 bg-card/50 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Robots.txt
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyRobotsUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
                  <Button onClick={saveRobotsTxt} disabled={savingRobots}>
                    {savingRobots ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>

              <div className="bg-background/50 rounded-lg p-4 border border-border/30 mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Robots URL:</strong>
                </p>
                <code className="text-sm text-primary break-all">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/robots</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Configure which pages search engine crawlers can access.
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Edit robots.txt:</Label>
                <Textarea
                  value={robotsTxt}
                  onChange={(e) => setRobotsTxt(e.target.value)}
                  className="font-mono text-sm"
                  rows={15}
                  placeholder="User-agent: *\nAllow: /"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Common directives: User-agent, Allow, Disallow, Sitemap
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
