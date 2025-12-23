import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Lock, 
  Play, 
  Clock, 
  Video, 
  BookOpen,
  Sparkles,
  Crown,
  ChevronRight,
  Star,
  Zap,
  Trophy
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  duration_minutes: number;
  is_locked: boolean;
  unlock_coins: number;
  video_count: number;
}

export default function Learn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          category,
          difficulty,
          duration_minutes,
          is_locked,
          unlock_coins
        `)
        .eq('is_published', true)
        .order('order_index');

      if (error) throw error;

      // Get video counts
      const coursesWithCounts = await Promise.all(
        (data || []).map(async (course) => {
          const { count } = await supabase
            .from('course_videos')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course.id);
          return { ...course, video_count: count || 0 };
        })
      );

      setCourses(coursesWithCounts);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-white/20 text-white/60';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trading': return <Zap className="w-4 h-4" />;
      case 'forex': return <Crown className="w-4 h-4" />;
      case 'crypto': return <Sparkles className="w-4 h-4" />;
      case 'stocks': return <Trophy className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0c0c] to-[#101010]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-24">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500 text-sm font-medium">PropScholar Academy</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Master <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Trading</span>
              <br />
              With Expert Courses
            </h1>
            
            <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
              Learn from industry professionals and take your trading skills to the next level with our curated video courses.
            </p>

            <div className="flex items-center justify-center gap-6 text-white/40">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                <span>{courses.reduce((acc, c) => acc + c.video_count, 0)}+ Videos</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{courses.length} Courses</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span>Expert Content</span>
              </div>
            </div>
          </div>

          {/* Coming Soon Banner */}
          <Card className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-500/20 mb-12 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            <CardContent className="p-8 md:p-12 text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-6">
                <Lock className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Premium Courses Coming Soon
              </h2>
              <p className="text-white/60 max-w-xl mx-auto mb-6">
                We're preparing exclusive trading courses taught by industry experts. 
                Stay tuned for world-class educational content that will transform your trading journey.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button 
                  onClick={() => navigate('/auth')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Notified
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Courses Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
                  <div className="h-48 bg-white/10" />
                  <CardContent className="p-6">
                    <div className="h-6 bg-white/10 rounded mb-4 w-3/4" />
                    <div className="h-4 bg-white/10 rounded mb-2 w-full" />
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <GraduationCap className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">Courses Coming Soon</h3>
                <p className="text-white/60">
                  We're preparing amazing content for you. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card 
                  key={course.id} 
                  className="bg-white/5 border-white/10 overflow-hidden group hover:border-yellow-500/30 transition-all duration-300 cursor-pointer"
                  onClick={() => toast.info('This course is coming soon!')}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 overflow-hidden">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-16 h-16 text-white/20" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Lock Badge */}
                    {course.is_locked && (
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                          <Lock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">Locked</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-7 h-7 text-black ml-1" />
                      </div>
                    </div>
                    
                    {/* Category */}
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-white/10 backdrop-blur-sm border-white/20 capitalize">
                        {getCategoryIcon(course.category)}
                        <span className="ml-1">{course.category}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-yellow-500 transition-colors">
                        {course.title}
                      </h3>
                    </div>
                    
                    <p className="text-white/50 text-sm line-clamp-2 mb-4">
                      {course.description || 'Master essential trading concepts and strategies.'}
                    </p>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-white/40 text-sm">
                        <Video className="w-4 h-4" />
                        {course.video_count} lessons
                      </span>
                      {course.duration_minutes > 0 && (
                        <span className="flex items-center gap-1 text-white/40 text-sm">
                          <Clock className="w-4 h-4" />
                          {course.duration_minutes}m
                        </span>
                      )}
                    </div>
                    
                    {/* CTA */}
                    <Button 
                      className="w-full bg-white/5 hover:bg-yellow-500 hover:text-black border border-white/10 hover:border-yellow-500 transition-all group/btn"
                      disabled={course.is_locked}
                    >
                      {course.is_locked ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Coming Soon
                        </>
                      ) : (
                        <>
                          Start Learning
                          <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Features Section */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-7 h-7 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Expert Instructors</h3>
              <p className="text-white/50 text-sm">
                Learn from professional traders with years of market experience
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Video className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">HD Video Content</h3>
              <p className="text-white/50 text-sm">
                Crystal clear video lessons you can watch anytime, anywhere
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Earn Rewards</h3>
              <p className="text-white/50 text-sm">
                Complete courses and earn coins to unlock exclusive content
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
