import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
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
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit, Trash2, Video, Play, Clock, Eye, GripVertical, Loader2 } from 'lucide-react';

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
}

interface Course {
  id: string;
  title: string;
  is_published: boolean;
}

export default function AdminCourseVideos() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { isLoggedIn } = useAdminAuth();
  
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
  });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/admin');
    }
  }, [isLoggedIn, navigate]);

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
      
      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .rpc('get_course_videos', { _course_id: courseId });
      
      if (videosError) throw videosError;
      setVideos(videosData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load course');
      navigate('/admin/scholar-hub');
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
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Title and Video URL are required');
      return;
    }

    setSaving(true);
    try {
      if (editingVideo) {
        const { error } = await supabase
          .from('course_videos')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast.success('Video updated');
      } else {
        const { error } = await supabase
          .from('course_videos')
          .insert([{ ...formData, course_id: courseId }]);
        if (error) throw error;
        toast.success('Video added');
      }
      setShowDialog(false);
      fetchCourseAndVideos();
    } catch (err) {
      console.error('Error saving video:', err);
      toast.error('Failed to save video');
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
      toast.success('Video deleted');
      setDeleteId(null);
      fetchCourseAndVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Failed to delete video');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/scholar-hub')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
            <div>
              <h1 className="text-2xl font-bold">{course?.title}</h1>
              <p className="text-white/60">Manage course videos</p>
            </div>
            <Badge className={course?.is_published ? 'bg-green-500' : 'bg-white/20'}>
              {course?.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <Button onClick={openCreateDialog} className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>

        {/* Videos List */}
        {videos.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Video className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No videos yet</h3>
              <p className="text-white/60 mb-4">Add your first video to this course</p>
              <Button onClick={openCreateDialog} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => (
              <Card key={video.id} className="bg-white/5 border-white/10 hover:border-yellow-500/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-white/30 cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                      {index + 1}
                    </div>
                    
                    {/* Thumbnail */}
                    <div 
                      className="w-32 h-20 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center cursor-pointer group relative overflow-hidden"
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
                            Preview
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/60 text-sm line-clamp-1">{video.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2 text-white/40 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(video.duration_seconds)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
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
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Lesson title"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Brief description"
                rows={2}
              />
            </div>
            
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
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="https://..."
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
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Free Preview</Label>
                <p className="text-white/60 text-sm">Allow viewing without unlock</p>
              </div>
              <Switch
                checked={formData.is_preview}
                onCheckedChange={(v) => setFormData({ ...formData, is_preview: v })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingVideo ? 'Save Changes' : 'Add Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete this video from the course.
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
