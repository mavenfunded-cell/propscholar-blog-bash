import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Calendar, Video, ArrowLeft, Trophy, XCircle, Crown, Medal, Award, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  featured_image_url: string | null;
  start_date: string;
  end_date: string;
  status: string;
  rewards: string | null;
}

interface Winner {
  id: string;
  position: number;
  submission: {
    name: string;
  };
}

const submissionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid Gmail address').refine(
    (email) => email.toLowerCase().endsWith('@gmail.com'),
    'Please use a Gmail address'
  ),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().max(1000).optional(),
});

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default function ReelEventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('competition_type', 'reel')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Reel contest not found');
        navigate('/reels');
        return;
      }

      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = event && event.status === 'active' && new Date(event.end_date) > new Date();
  const isEventExpired = event && new Date(event.end_date) < new Date();

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Video must be less than 200MB');
        return;
      }
      
      if (!file.type.startsWith('video/')) {
        toast.error('Please upload a video file');
        return;
      }
      
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadVideo = async (): Promise<string> => {
    if (!videoFile) throw new Error('No video file selected');

    const fileExt = videoFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `reels/${fileName}`;

    setUploadProgress(10);
    
    const { error: uploadError } = await supabase.storage
      .from('reel-videos')
      .upload(filePath, videoFile);

    setUploadProgress(90);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('reel-videos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;

    try {
      submissionSchema.parse({ name, email, phone, title, description });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (!videoFile) {
      toast.error('Please upload a video');
      return;
    }

    if (!isEventActive) {
      toast.error('This event is no longer accepting submissions');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      toast.info('Uploading video... Please wait');
      const videoUrl = await uploadVideo();
      const submissionEmail = email.toLowerCase();

      const { error } = await supabase
        .from('reel_submissions')
        .insert([{
          event_id: event.id,
          name,
          email: submissionEmail,
          phone,
          title,
          description: description || null,
          video_url: videoUrl,
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already submitted an entry for this contest with this email.');
          return;
        }
        throw error;
      }

      // Grant participation coins (if user is registered)
      try {
        await supabase.rpc('grant_participation_coins', { 
          _email: submissionEmail, 
          _participation_type: 'reel' 
        });
      } catch (coinErr) {
        console.log('Participation coins not granted:', coinErr);
      }

      toast.success('Reel submitted successfully!');
      navigate(`/reels/${slug}/success`);
    } catch (err: any) {
      console.error('Error submitting:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-white" />;
      case 2: return <Medal className="w-5 h-5 text-white/70" />;
      case 3: return <Medal className="w-5 h-5 text-white/50" />;
      default: return <Award className="w-5 h-5 text-white/40" />;
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `${position}th Place`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0c0c] to-[#101010]" />
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Featured Image */}
        {event.featured_image_url && (
          <div className="relative h-64 md:h-96 overflow-hidden">
            <img 
              src={event.featured_image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
          </div>
        )}

        <main className="container mx-auto px-4 py-8">
          <Link 
            to="/reels" 
            className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to reel contests
          </Link>

          <div className="max-w-3xl mx-auto">
            {/* Event Info */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Badge 
                  className={
                    isEventActive
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-white/5 text-white/50 border-white/10'
                  }
                >
                  {isEventActive ? 'Active' : 'Closed'}
                </Badge>
                {isEventExpired && (
                  <Badge variant="outline" className="border-white/20 text-white/50 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Expired
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">{event.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-white/50 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span>
                    {format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-white/70" />
                  <span>Max 200MB video</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-white/70 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>

            {/* Rewards Card */}
            {event.rewards && (
              <Card className="mb-8 border-white/10 bg-[#111]/80 backdrop-blur-xl animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Contest Rewards</h3>
                      <p className="text-white/60 whitespace-pre-wrap">{event.rewards}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submission Form or Closed Message */}
            {isEventActive ? (
              <Card className="animate-slide-up border-white/10 bg-[#111]/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Submit Your Reel</CardTitle>
                  <CardDescription className="text-white/50">
                    Upload your video entry for this reel competition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/80">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">Gmail Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@gmail.com"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white/80">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Your phone number"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Reel Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-white/80">
                        Reel Title <span className="text-white/50">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., My Trading Journey with PropScholar"
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-white/80">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us about your reel..."
                        rows={3}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>

                    {/* Video Upload */}
                    <div className="space-y-2">
                      <Label className="text-white/80">Video Upload <span className="text-white/50">*</span></Label>
                      <div className="border-2 border-dashed border-white/10 rounded-lg p-4">
                        {videoPreview ? (
                          <div className="space-y-4">
                            <div className="relative aspect-video bg-white/5 rounded-lg overflow-hidden">
                              <video 
                                src={videoPreview} 
                                controls 
                                className="w-full h-full object-contain"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 border-0"
                                onClick={removeVideo}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-white/50 text-center">
                              {videoFile?.name} ({(videoFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-white/5 transition-colors rounded-lg">
                            <Upload className="w-10 h-10 text-white/30 mb-2" />
                            <span className="text-sm text-white/50">Click to upload video</span>
                            <span className="text-xs text-white/30 mt-1">Max 200MB, MP4/MOV/AVI</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="video/*"
                              onChange={handleVideoChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {submitting && uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Uploading...</span>
                          <span className="text-white/60">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2 bg-white/10" />
                      </div>
                    )}

                    {/* Submit */}
                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full bg-white text-black hover:bg-white/90 transition-all"
                      disabled={submitting || !videoFile}
                    >
                      {submitting ? 'Uploading...' : 'Submit Reel'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="animate-fade-in border-white/10 bg-[#111]/80 backdrop-blur-xl">
                <CardContent className="p-8 text-center">
                  <XCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Contest Closed</h3>
                  <p className="text-white/50">
                    This contest is no longer accepting submissions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
