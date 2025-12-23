import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit, Trash2, Video, BookOpen, Clock, Lock, Unlock, GraduationCap, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  duration_minutes: number;
  is_published: boolean;
  is_locked: boolean;
  unlock_coins: number;
  order_index: number;
  created_at: string;
  video_count: number;
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAdminAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    category: 'trading',
    difficulty: 'beginner',
    duration_minutes: 0,
    is_published: false,
    is_locked: true,
    unlock_coins: 0,
    order_index: 0,
  });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/admin');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCourses();
    }
  }, [isLoggedIn]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_courses');
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      thumbnail_url: '',
      category: 'trading',
      difficulty: 'beginner',
      duration_minutes: 0,
      is_published: false,
      is_locked: true,
      unlock_coins: 0,
      order_index: courses.length,
    });
    setShowDialog(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      thumbnail_url: course.thumbnail_url || '',
      category: course.category,
      difficulty: course.difficulty,
      duration_minutes: course.duration_minutes,
      is_published: course.is_published,
      is_locked: course.is_locked,
      unlock_coins: course.unlock_coins,
      order_index: course.order_index,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCourse.id);
        if (error) throw error;
        toast.success('Course updated');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([formData]);
        if (error) throw error;
        toast.success('Course created');
      }
      setShowDialog(false);
      fetchCourses();
    } catch (err) {
      console.error('Error saving course:', err);
      toast.error('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      toast.success('Course deleted');
      setDeleteId(null);
      fetchCourses();
    } catch (err) {
      console.error('Error deleting course:', err);
      toast.error('Failed to delete course');
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);
      if (error) throw error;
      toast.success(course.is_published ? 'Course unpublished' : 'Course published');
      fetchCourses();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('Failed to update course');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const categories = ['trading', 'forex', 'crypto', 'stocks', 'mindset', 'general'];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
            <div>
              <h1 className="text-2xl font-bold">Course Management</h1>
              <p className="text-white/60">Create and manage educational content</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <BookOpen className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Total Courses</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <GraduationCap className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Published</p>
                  <p className="text-2xl font-bold">{courses.filter(c => c.is_published).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Video className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Total Videos</p>
                  <p className="text-2xl font-bold">{courses.reduce((acc, c) => acc + (c.video_count || 0), 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Lock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Locked</p>
                  <p className="text-2xl font-bold">{courses.filter(c => c.is_locked).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses List */}
        {courses.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses yet</h3>
              <p className="text-white/60 mb-4">Create your first course to get started</p>
              <Button onClick={openCreateDialog} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="bg-white/5 border-white/10 overflow-hidden group hover:border-yellow-500/50 transition-all">
                {/* Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {course.is_locked && (
                      <Badge className="bg-red-500/80 text-white">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                    <Badge className={course.is_published ? 'bg-green-500' : 'bg-white/20'}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
                  </div>
                  
                  <p className="text-white/60 text-sm line-clamp-2 mb-3">
                    {course.description || 'No description'}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">{course.category}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{course.difficulty}</Badge>
                    <Badge variant="outline" className="text-xs">
                      <Video className="w-3 h-3 mr-1" />
                      {course.video_count} videos
                    </Badge>
                    {course.duration_minutes > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {course.duration_minutes}m
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/admin/courses/${course.id}/videos`)}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Videos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(course)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => togglePublish(course)}
                      className={course.is_published ? 'text-red-400' : 'text-green-400'}
                    >
                      {course.is_published ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-400"
                      onClick={() => setDeleteId(course.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Create Course'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Course title"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Course description"
                rows={3}
              />
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
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
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
                <Label>Locked</Label>
                <p className="text-white/60 text-sm">Require unlock to access</p>
              </div>
              <Switch
                checked={formData.is_locked}
                onCheckedChange={(v) => setFormData({ ...formData, is_locked: v })}
              />
            </div>
            
            {formData.is_locked && (
              <div>
                <Label>Unlock Cost (Coins)</Label>
                <Input
                  type="number"
                  value={formData.unlock_coins}
                  onChange={(e) => setFormData({ ...formData, unlock_coins: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Published</Label>
                <p className="text-white/60 text-sm">Visible to users</p>
              </div>
              <Switch
                checked={formData.is_published}
                onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete the course and all its videos. This action cannot be undone.
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
