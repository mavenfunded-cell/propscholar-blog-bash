import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Trophy,
  Rocket,
  Shield,
  Users
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
      case 'beginner': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'intermediate': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'advanced': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
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
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      {/* Deep Space Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#080810] to-[#0a0a14]" />
        
        {/* Nebula effects */}
        <div className="absolute top-0 left-1/3 w-[800px] h-[800px] bg-amber-500/[0.03] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-purple-500/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/[0.02] rounded-full blur-[80px]" />
        
        {/* Stars */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, white, transparent),
                            radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
                            radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
                            radial-gradient(1px 1px at 90px 40px, white, transparent),
                            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
                            radial-gradient(2px 2px at 160px 120px, rgba(255,200,100,0.8), transparent),
                            radial-gradient(1px 1px at 200px 100px, white, transparent),
                            radial-gradient(1px 1px at 300px 200px, rgba(255,255,255,0.5), transparent)`,
          backgroundSize: '400px 400px'
        }} />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '100px 100px'
        }} />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-24">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 mb-8 backdrop-blur-sm">
              <Rocket className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-semibold tracking-wide">PropScholar Academy</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="text-white/90">Unlock </span>
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">Trading Mastery</span>
              <br />
              <span className="text-white/70 text-4xl md:text-5xl">By Invitation Only</span>
            </h1>
            
            <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
              Exclusive access to genuine trading knowledge, strategies, and insights from industry veterans. 
              This isn't a course—it's your gateway to becoming a scholar of the markets.
            </p>

            <div className="flex items-center justify-center gap-8 text-white/30">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500/50" />
                <span className="text-sm">{courses.reduce((acc, c) => acc + c.video_count, 0)}+ Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500/50" />
                <span className="text-sm">{courses.length} Modules</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500/50" />
                <span className="text-sm">Verified Knowledge</span>
              </div>
            </div>
          </div>

          {/* Invitation Banner */}
          <Card className="relative mb-16 overflow-hidden border-0">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
            
            {/* Animated border */}
            <div className="absolute inset-0 rounded-xl border border-amber-500/20" />
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-transparent via-amber-500/30 to-transparent opacity-50 blur-sm" />
            
            <CardContent className="relative p-10 md:p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 mb-8 ring-2 ring-amber-500/20 ring-offset-4 ring-offset-[#050508]">
                <Lock className="w-10 h-10 text-amber-400" />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                Scholar Access Opening Soon
              </h2>
              
              <p className="text-white/50 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
                We're curating an exclusive library of trading wisdom—not for sale, but for those committed to genuine market mastery. 
                Join the waitlist to be considered for early access.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold px-8 py-6 text-lg shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Scholar Hub
                </Button>
                <span className="text-white/30 text-sm">Invitation only • No courses sold</span>
              </div>
            </CardContent>
          </Card>

          {/* Modules Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white/[0.02] border-white/5 animate-pulse">
                  <div className="h-52 bg-white/5" />
                  <CardContent className="p-6">
                    <div className="h-6 bg-white/5 rounded mb-4 w-3/4" />
                    <div className="h-4 bg-white/5 rounded mb-2 w-full" />
                    <div className="h-4 bg-white/5 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-10 h-10 text-amber-500/40" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-white/80">Modules In Development</h3>
                <p className="text-white/40 max-w-md mx-auto">
                  Our team of expert traders is preparing exclusive content. 
                  Join the Scholar Hub to be notified when access opens.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card 
                  key={course.id} 
                  className="bg-white/[0.02] border-white/5 overflow-hidden group hover:border-amber-500/20 transition-all duration-500 cursor-pointer backdrop-blur-sm"
                  onClick={() => toast.info('Access opening soon. Join the Scholar Hub!')}
                >
                  {/* Thumbnail */}
                  <div className="relative h-52 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent overflow-hidden">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-16 h-16 text-white/10" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/50 to-transparent" />
                    
                    {/* Lock Badge */}
                    {course.is_locked && (
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/20">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400/80">Invite Only</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-7 h-7 text-black ml-1" />
                      </div>
                    </div>
                    
                    {/* Category */}
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-black/60 backdrop-blur-md border-white/10 capitalize text-white/70">
                        {getCategoryIcon(course.category)}
                        <span className="ml-1.5">{course.category}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-lg line-clamp-2 text-white/90 group-hover:text-amber-400 transition-colors duration-300">
                        {course.title}
                      </h3>
                    </div>
                    
                    <p className="text-white/40 text-sm line-clamp-2 mb-5">
                      {course.description || 'Master essential trading concepts and market strategies.'}
                    </p>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                      <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-white/30 text-sm">
                        <Video className="w-4 h-4" />
                        {course.video_count} sessions
                      </span>
                      {course.duration_minutes > 0 && (
                        <span className="flex items-center gap-1.5 text-white/30 text-sm">
                          <Clock className="w-4 h-4" />
                          {course.duration_minutes}m
                        </span>
                      )}
                    </div>
                    
                    {/* CTA */}
                    <Button 
                      className="w-full bg-white/[0.03] hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-black border border-white/10 hover:border-amber-500 transition-all duration-300 group/btn font-medium"
                      disabled={course.is_locked}
                    >
                      {course.is_locked ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Await Invitation
                        </>
                      ) : (
                        <>
                          Begin Session
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
          <div className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-amber-500/20 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-white/90">Veteran Mentors</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Learn from traders who've navigated decades of market cycles
              </p>
            </div>
            
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-orange-500/20 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
                <Video className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-white/90">Genuine Knowledge</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Real strategies and insights—no fluff, no sales pitches
              </p>
            </div>
            
            <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-rose-500/20 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-white/90">Scholar Community</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Join a network of serious traders committed to growth
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
