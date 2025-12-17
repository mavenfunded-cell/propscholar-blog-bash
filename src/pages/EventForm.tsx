import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, X, Image as ImageIcon, PenTool, Video } from 'lucide-react';

export default function EventForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [competitionType, setCompetitionType] = useState<'blog' | 'reel'>('blog');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minWords, setMinWords] = useState(250);
  const [rewards, setRewards] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEditing);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isEditing && isAdmin) {
      fetchEvent();
    }
  }, [id, isAdmin]);

  useEffect(() => {
    if (!isEditing && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
      setSlug(generatedSlug);
    }
  }, [title, isEditing]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setCompetitionType((data.competition_type as 'blog' | 'reel') || 'blog');
      setTitle(data.title);
      setDescription(data.description);
      setSlug(data.slug);
      setStartDate(data.start_date.split('T')[0]);
      setEndDate(data.end_date.split('T')[0]);
      setMinWords(data.min_words);
      setRewards(data.rewards || '');
      setExistingImageUrl(data.featured_image_url);
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Failed to load event');
      navigate('/admin/dashboard');
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (!isEditing) {
      setExistingImageUrl(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return existingImageUrl;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `events/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        toast.error('End date must be after start date');
        setLoading(false);
        return;
      }

      // Upload image if provided
      let imageUrl = existingImageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const eventData = {
        title,
        description,
        slug,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        min_words: competitionType === 'blog' ? minWords : 0,
        rewards: rewards || null,
        featured_image_url: imageUrl,
        competition_type: competitionType,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', id);

        if (error) throw error;
        toast.success('Event updated successfully');
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert([eventData])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            toast.error('An event with this slug already exists');
            setLoading(false);
            return;
          }
          throw error;
        }
        
        // Send notification emails to all users
        try {
          await supabase.functions.invoke('notify-new-event', {
            body: {
              event_id: newEvent.id,
              event_title: newEvent.title,
              event_description: newEvent.description,
              event_type: newEvent.competition_type,
              start_date: newEvent.start_date,
              end_date: newEvent.end_date,
            }
          });
          console.log('Event notification emails sent');
        } catch (notifyError) {
          console.error('Failed to send notification emails:', notifyError);
        }
        
        toast.success('Event created successfully');
      }

      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Error saving event:', err);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingEvent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link 
          to="/admin/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Event' : 'Create New Event'}</CardTitle>
            <CardDescription>
              {isEditing ? 'Update the event details below' : 'Fill in the details for your new competition event'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Competition Type */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label>Competition Type</Label>
                  <Select value={competitionType} onValueChange={(value: 'blog' | 'reel') => setCompetitionType(value)}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog">
                        <div className="flex items-center gap-2">
                          <PenTool className="w-4 h-4 text-blue-400" />
                          Blog Competition
                        </div>
                      </SelectItem>
                      <SelectItem value="reel">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-purple-400" />
                          Reel Competition
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={competitionType === 'blog' ? 'e.g., Trading Psychology Contest 2025' : 'e.g., Best Trading Reel Contest'}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/{competitionType === 'reel' ? 'reels' : 'events'}/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="trading-psychology-2025"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the event, topic guidelines, and any rules..."
                  rows={4}
                  required
                />
              </div>

              {/* Featured Image */}
              <div className="space-y-2">
                <Label>Featured Image</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  {(imagePreview || existingImageUrl) ? (
                    <div className="relative">
                      <img 
                        src={imagePreview || existingImageUrl || ''} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-secondary/50 transition-colors rounded-lg">
                      <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                      <span className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Min Words (Blog only) */}
              {competitionType === 'blog' && (
                <div className="space-y-2">
                  <Label htmlFor="minWords">Minimum Word Count</Label>
                  <Input
                    id="minWords"
                    type="number"
                    min={50}
                    max={5000}
                    value={minWords}
                    onChange={(e) => setMinWords(parseInt(e.target.value) || 250)}
                    required
                  />
                </div>
              )}

              {/* Rewards */}
              <div className="space-y-2">
                <Label htmlFor="rewards">Contest Rewards (Optional)</Label>
                <Textarea
                  id="rewards"
                  value={rewards}
                  onChange={(e) => setRewards(e.target.value)}
                  placeholder="e.g., 1st Place: $500 scholarship, 2nd Place: $250 scholarship..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the prizes/rewards for winners. This will be shown to participants.
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className={`flex-1 ${competitionType === 'reel' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
                >
                  {loading ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event')}
                </Button>
                <Link to="/admin/dashboard">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
