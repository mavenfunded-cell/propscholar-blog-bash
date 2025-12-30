import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getAdminPath } from '@/hooks/useAdminSubdomain';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, Edit, Trash2, Video, Play, Clock, Eye, GripVertical, 
  Loader2, Search, Tag, FileText, Link2, ExternalLink, Image
} from 'lucide-react';

interface CourseVideo {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  order_index: number;
  is_preview: boolean;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[] | null;
  transcript: string | null;
  resources: any;
}

interface Course {
  id: string;
  title: string;
  is_published: boolean;
}

export default function AdminCourseVideos() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { isLoggedIn, loading: authLoading } = useAdminAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<CourseVideo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration_seconds: 0,
    order_index: 0,
    is_preview: false,
    seo_title: '',
    seo_description: '',
    tags: '',
    transcript: '',
    resources: [] as { title: string; url: string; type: string }[],
  });

  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'link' });

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate(getAdminPath('/admin'));
    }
  }, [isLoggedIn, authLoading, navigate]);

  useEffect(() => {
    if (isLoggedIn && courseId) {
      fetchCourseAndVideos();
    }
  }, [isLoggedIn, courseId]);

  const fetchCourseAndVideos = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, is_published')
        .eq('id', courseId)
        .single();
      
      if (courseError) throw courseError;
      setCourse(courseData);
      
      // Fetch videos directly from table
      const { data: videosData, error: videosError } = await supabase
        .from('course_videos')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');
      
      if (videosError) throw videosError;
      setVideos(videosData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load course');
      navigate(getAdminPath('/admin/scholar-hub'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingVideo(null);
    setFormData({
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      duration_seconds: 0,
      order_index: videos.length,
      is_preview: false,
      seo_title: '',
      seo_description: '',
      tags: '',
      transcript: '',
      resources: [],
    });
    setShowDialog(true);
  };

  const openEditDialog = (video: CourseVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration_seconds: video.duration_seconds,
      order_index: video.order_index,
      is_preview: video.is_preview,
      seo_title: video.seo_title || '',
      seo_description: video.seo_description || '',
      tags: (video.tags || []).join(', '),
      transcript: video.transcript || '',
      resources: (video.resources as any[]) || [],
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Title and Video URL are required');
      return;
    }

    const tagsArray = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    setSaving(true);
    try {
      const videoData = {
        title: formData.title,
        description: formData.description || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        duration_seconds: formData.duration_seconds,
        order_index: formData.order_index,
        is_preview: formData.is_preview,
        seo_title: formData.seo_title || formData.title,
        seo_description: formData.seo_description || formData.description,
        tags: tagsArray.length > 0 ? tagsArray : null,
        transcript: formData.transcript || null,
        resources: formData.resources.length > 0 ? formData.resources : null,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('course_videos')
          .update({ ...videoData, updated_at: new Date().toISOString() })
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast.success('Session updated');
      } else {
        const { error } = await supabase
          .from('course_videos')
          .insert([{ ...videoData, course_id: courseId }]);
        if (error) throw error;
        toast.success('Session added');
      }
      setShowDialog(false);
      fetchCourseAndVideos();
    } catch (err) {
      console.error('Error saving video:', err);
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('course_videos')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      toast.success('Session deleted');
      setDeleteId(null);
      fetchCourseAndVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Failed to delete session');
    }
  };

  const addResource = () => {
    if (!newResource.title.trim() || !newResource.url.trim()) {
      toast.error('Resource title and URL are required');
      return;
    }
    setFormData({
      ...formData,
      resources: [...formData.resources, { ...newResource }],
    });
    setNewResource({ title: '', url: '', type: 'link' });
  };

  const removeResource = (index: number) => {
    setFormData({
      ...formData,
      resources: formData.resources.filter((_, i) => i !== index),
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    return url;
  };

  const extractYouTubeThumbnail = () => {
    const ytMatch = formData.video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      setFormData({ ...formData, thumbnail_url: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` });
      toast.success('Thumbnail extracted from YouTube');
    } else {
      toast.error('Could not extract thumbnail. Not a valid YouTube URL.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(getAdminPath('/admin/scholar-hub'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
            <div>
              <h1 className="text-2xl font-bold">{course?.title}</h1>
              <p className="text-white/60">Manage sessions for this module</p>
            </div>
            <Badge className={course?.is_published ? 'bg-green-500' : 'bg-white/20'}>
              {course?.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <Button onClick={openCreateDialog} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Session
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Video className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Sessions</p>
                <p className="text-2xl font-bold">{videos.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Free Previews</p>
                <p className="text-2xl font-bold">{videos.filter(v => v.is_preview).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Duration</p>
                <p className="text-2xl font-bold">{formatDuration(videos.reduce((acc, v) => acc + v.duration_seconds, 0))}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Videos List */}
        {videos.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Video className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
              <p className="text-white/60 mb-4">Add your first session to this module</p>
              <Button onClick={openCreateDialog} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => (
              <Card key={video.id} className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-white/30 cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                      {index + 1}
                    </div>
                    
                    {/* Thumbnail */}
                    <div 
                      className="w-36 h-20 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center cursor-pointer group relative overflow-hidden flex-shrink-0"
                      onClick={() => setPreviewUrl(video.video_url)}
                    >
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-8 h-8 text-white/30" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{video.title}</h3>
                        {video.is_preview && (
                          <Badge className="bg-blue-500/20 text-blue-400">
                            <Eye className="w-3 h-3 mr-1" />
                            Free Preview
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/60 text-sm line-clamp-1">{video.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2 text-white/40 text-xs flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(video.duration_seconds)}
                        </span>
                        {video.tags && video.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {video.tags.slice(0, 3).join(', ')}
                            {video.tags.length > 3 && ` +${video.tags.length - 3}`}
                          </span>
                        )}
                        {video.resources && (video.resources as any[]).length > 0 && (
                          <span className="flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            {(video.resources as any[]).length} resources
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setPreviewUrl(video.video_url)}>
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(video)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-400" onClick={() => setDeleteId(video.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-4xl p-0">
          <div className="aspect-video">
            {previewUrl && (
              <iframe
                src={getEmbedUrl(previewUrl)}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              {editingVideo ? 'Edit Session' : 'Add Session'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="bg-white/5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="seo">SEO & Tags</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Session title"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Brief description of this session..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={formData.duration_seconds}
                    onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    {formatDuration(formData.duration_seconds)}
                  </p>
                </div>
                
                <div>
                  <Label>Order Index</Label>
                  <Input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/5">
                <div>
                  <Label>Free Preview</Label>
                  <p className="text-white/60 text-sm">Allow viewing without invitation</p>
                </div>
                <Switch
                  checked={formData.is_preview}
                  onCheckedChange={(v) => setFormData({ ...formData, is_preview: v })}
                />
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              <div>
                <Label>Video URL *</Label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="YouTube, Vimeo, or direct video URL"
                />
                <p className="text-white/40 text-xs mt-1">Supports YouTube, Vimeo, and direct video links</p>
              </div>
              
              <div>
                <Label>Thumbnail URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="bg-white/5 border-white/10 flex-1"
                    placeholder="https://..."
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={extractYouTubeThumbnail}
                  >
                    <Image className="w-4 h-4 mr-1" />
                    Auto
                  </Button>
                </div>
                {formData.thumbnail_url && (
                  <div className="mt-2 h-32 rounded-lg overflow-hidden">
                    <img src={formData.thumbnail_url} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <Label>Transcript</Label>
                <Textarea
                  value={formData.transcript}
                  onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Full transcript of the video (helps with SEO)..."
                  rows={6}
                />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div>
                <Label>SEO Title</Label>
                <Input
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Custom SEO title (defaults to session title)"
                />
              </div>
              
              <div>
                <Label>SEO Description</Label>
                <Textarea
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Meta description for search engines..."
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Tags</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="trading, forex, strategy, price-action, ..."
                />
                <p className="text-white/40 text-xs mt-1">Comma-separated list of tags</p>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Add Resource</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="Resource title"
                    />
                    <Input
                      value={newResource.url}
                      onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="URL"
                    />
                    <Button onClick={addResource} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {formData.resources.length > 0 && (
                  <div className="space-y-2">
                    <Label>Attached Resources</Label>
                    {formData.resources.map((resource, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                        <Link2 className="w-4 h-4 text-amber-500" />
                        <span className="flex-1 truncate">{resource.title}</span>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => removeResource(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingVideo ? 'Save Changes' : 'Add Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete this session from the module.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
