import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { getAdminPath } from '@/hooks/useAdminSubdomain';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, Edit, Trash2, Video, BookOpen, Clock, Lock, Unlock, 
  GraduationCap, Loader2, Settings, Tag, Search, Eye, EyeOff, User,
  Palette, Sparkles
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  order_index: number;
  is_active: boolean;
}

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
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_avatar: string | null;
}

export default function AdminScholarHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, loading: authLoading } = useAdminAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('courses');
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Category dialog
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    category: 'price-action',
    difficulty: 'beginner',
    duration_minutes: 0,
    is_published: false,
    is_locked: true,
    unlock_coins: 0,
    order_index: 0,
    slug: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    instructor_name: '',
    instructor_bio: '',
    instructor_avatar: '',
  });
  
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'book',
    color: '#F59E0B',
    order_index: 0,
    is_active: true,
  });

  useEffect(() => {
    console.log('[AdminScholarHub] route', location.pathname, { authLoading, isLoggedIn });
    if (!authLoading && !isLoggedIn) {
      console.log('[AdminScholarHub] redirect ->', getAdminPath('/admin'));
      navigate(getAdminPath('/admin'));
    }
  }, [isLoggedIn, authLoading, navigate, location.pathname]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .rpc('get_all_courses');
      
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .rpc('get_all_scholar_categories');
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const openCreateDialog = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      thumbnail_url: '',
      category: categories[0]?.slug || 'general',
      difficulty: 'beginner',
      duration_minutes: 0,
      is_published: false,
      is_locked: true,
      unlock_coins: 0,
      order_index: courses.length,
      slug: '',
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      instructor_name: '',
      instructor_bio: '',
      instructor_avatar: '',
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
      slug: course.slug || '',
      seo_title: course.seo_title || '',
      seo_description: course.seo_description || '',
      seo_keywords: course.seo_keywords || '',
      instructor_name: course.instructor_name || '',
      instructor_bio: course.instructor_bio || '',
      instructor_avatar: course.instructor_avatar || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const slug = formData.slug || generateSlug(formData.title);
    const seoTitle = formData.seo_title || formData.title;
    const seoDescription = formData.seo_description || formData.description;

    setSaving(true);
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update({
            ...formData,
            slug,
            seo_title: seoTitle,
            seo_description: seoDescription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCourse.id);
        if (error) throw error;
        toast.success('Module updated');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{ ...formData, slug, seo_title: seoTitle, seo_description: seoDescription }]);
        if (error) throw error;
        toast.success('Module created');
      }
      setShowDialog(false);
      fetchData();
    } catch (err) {
      console.error('Error saving module:', err);
      toast.error('Failed to save module');
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
      toast.success('Module deleted');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting module:', err);
      toast.error('Failed to delete module');
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);
      if (error) throw error;
      toast.success(course.is_published ? 'Module hidden' : 'Module published');
      fetchData();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('Failed to update module');
    }
  };

  // Category functions
  const openCreateCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'book',
      color: '#F59E0B',
      order_index: categories.length,
      is_active: true,
    });
    setShowCategoryDialog(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon,
      color: category.color,
      order_index: category.order_index,
      is_active: category.is_active,
    });
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const slug = categoryFormData.slug || generateSlug(categoryFormData.name);

    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('scholar_categories')
          .update({ ...categoryFormData, slug, updated_at: new Date().toISOString() })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('scholar_categories')
          .insert([{ ...categoryFormData, slug }]);
        if (error) throw error;
        toast.success('Category created');
      }
      setShowCategoryDialog(false);
      fetchData();
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    
    try {
      const { error } = await supabase
        .from('scholar_categories')
        .delete()
        .eq('id', deleteCategoryId);
      if (error) throw error;
      toast.success('Category deleted');
      setDeleteCategoryId(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category');
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
            <Button variant="ghost" size="icon" onClick={() => navigate(getAdminPath('/admin/dashboard'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                Scholar Hub Management
              </h1>
              <p className="text-white/60">Create and manage exclusive trading knowledge</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="courses" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <BookOpen className="w-4 h-4 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Tag className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Modules Tab */}
          <TabsContent value="courses" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Modules</p>
                      <p className="text-2xl font-bold">{courses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Eye className="w-5 h-5 text-green-500" />
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
                      <p className="text-white/60 text-sm">Total Sessions</p>
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
                      <p className="text-white/60 text-sm">Invite Only</p>
                      <p className="text-2xl font-bold">{courses.filter(c => c.is_locked).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Add Module Button */}
            <div className="flex justify-end">
              <Button onClick={openCreateDialog} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
            </div>

            {/* Modules List */}
            {courses.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No modules yet</h3>
                  <p className="text-white/60 mb-4">Create your first knowledge module</p>
                  <Button onClick={openCreateDialog} className="bg-amber-500 hover:bg-amber-600 text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="bg-white/5 border-white/10 overflow-hidden hover:border-amber-500/30 transition-all">
                    {/* Thumbnail */}
                    <div className="relative h-40 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                      
                      {/* Status badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge className={course.is_published ? 'bg-green-500' : 'bg-white/20'}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        {course.is_locked && (
                          <Badge className="bg-purple-500/80">
                            <Lock className="w-3 h-3 mr-1" />
                            Invite Only
                          </Badge>
                        )}
                      </div>
                      
                      {/* Video count */}
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="outline" className="bg-black/60 border-white/20">
                          <Video className="w-3 h-3 mr-1" />
                          {course.video_count || 0} sessions
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs capitalize mb-2">
                          {categories.find(c => c.slug === course.category)?.name || course.category}
                        </Badge>
                        <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
                        <p className="text-white/60 text-sm line-clamp-2 mt-1">
                          {course.description || 'No description'}
                        </p>
                      </div>
                      
                      {/* Instructor */}
                      {course.instructor_name && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-white/50">
                          <User className="w-4 h-4" />
                          <span>{course.instructor_name}</span>
                        </div>
                      )}
                      
                      {/* Meta */}
                      <div className="flex items-center gap-3 text-white/40 text-xs mb-4">
                        <Badge variant="outline" className="text-xs capitalize">{course.difficulty}</Badge>
                        {course.duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {course.duration_minutes}m
                          </span>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(getAdminPath(`/admin/scholar-hub/${course.id}/videos`))}
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Sessions
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(course)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => togglePublish(course)}
                        >
                          {course.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-400" onClick={() => setDeleteId(course.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Knowledge Categories</h2>
                <p className="text-white/60 text-sm">Organize your modules into categories</p>
              </div>
              <Button onClick={openCreateCategoryDialog} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <Tag className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          <p className="text-white/50 text-sm">{category.slug}</p>
                        </div>
                      </div>
                      <Badge className={category.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}>
                        {category.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-white/60 text-sm mt-3 line-clamp-2">{category.description}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditCategoryDialog(category)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-400" onClick={() => setDeleteCategoryId(category.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Module Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              {editingCourse ? 'Edit Module' : 'Create Module'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="bg-white/5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      title: e.target.value,
                      slug: generateSlug(e.target.value)
                    });
                  }}
                  className="bg-white/5 border-white/10"
                  placeholder="Module title"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Describe what scholars will learn..."
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
                {formData.thumbnail_url && (
                  <div className="mt-2 h-32 rounded-lg overflow-hidden">
                    <img src={formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
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
                        <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
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
            </TabsContent>

            <TabsContent value="instructor" className="space-y-4">
              <div>
                <Label>Instructor Name</Label>
                <Input
                  value={formData.instructor_name}
                  onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <Label>Instructor Bio</Label>
                <Textarea
                  value={formData.instructor_bio}
                  onChange={(e) => setFormData({ ...formData, instructor_bio: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Brief bio about the instructor..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Instructor Avatar URL</Label>
                <Input
                  value={formData.instructor_avatar}
                  onChange={(e) => setFormData({ ...formData, instructor_avatar: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="https://..."
                />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div>
                <Label>URL Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="module-url-slug"
                />
                <p className="text-white/40 text-xs mt-1">Auto-generated from title if left empty</p>
              </div>
              
              <div>
                <Label>SEO Title</Label>
                <Input
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="Custom SEO title (defaults to module title)"
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
                <Label>SEO Keywords</Label>
                <Input
                  value={formData.seo_keywords}
                  onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                  className="bg-white/5 border-white/10"
                  placeholder="trading, forex, strategy, ..."
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/5">
                <div>
                  <Label>Invite Only Access</Label>
                  <p className="text-white/60 text-sm">Require invitation to view content</p>
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
              
              <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/5">
                <div>
                  <Label>Published</Label>
                  <p className="text-white/60 text-sm">Make visible to scholars</p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCourse ? 'Save Changes' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) => {
                  setCategoryFormData({ 
                    ...categoryFormData, 
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  });
                }}
                className="bg-white/5 border-white/10"
                placeholder="Category name"
              />
            </div>
            
            <div>
              <Label>Slug</Label>
              <Input
                value={categoryFormData.slug}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="category-slug"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="w-12 h-10 p-1 bg-white/5 border-white/10"
                  />
                  <Input
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="bg-white/5 border-white/10 flex-1"
                  />
                </div>
              </div>
              
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={categoryFormData.order_index}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, order_index: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Active</Label>
                <p className="text-white/60 text-sm">Show in category list</p>
              </div>
              <Switch
                checked={categoryFormData.is_active}
                onCheckedChange={(v) => setCategoryFormData({ ...categoryFormData, is_active: v })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete the module and all its sessions. This action cannot be undone.
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

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete this category. Modules using this category will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
