import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, PenTool, Video, Sparkles, Trophy, Users, Zap } from 'lucide-react';

const competitions = [
  {
    title: 'Blog Competition',
    description: 'Showcase your writing skills and share insights on trading, finance, and market analysis.',
    icon: PenTool,
    href: '/blog',
    status: 'active',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    title: 'Reel Competition',
    description: 'Create engaging video content about trading strategies, market insights, and financial education.',
    icon: Video,
    href: '/reels',
    status: 'active',
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    title: 'Quiz Challenge',
    description: 'Test your trading knowledge and compete with others in our interactive quiz competitions.',
    icon: Sparkles,
    href: '#',
    status: 'coming-soon',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
];

const stats = [
  { label: 'Active Participants', value: '2,500+', icon: Users },
  { label: 'Total Prizes', value: '₹50,000+', icon: Trophy },
  { label: 'Competitions', value: '10+', icon: Zap },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-background to-[#0c1222]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/3 to-transparent rounded-full" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center animate-fade-in">
              <Badge variant="outline" className="mb-6 border-primary/40 text-primary px-4 py-1.5 text-sm">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Welcome to PropScholar Space
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
                <span className="text-foreground">Compete.</span>{' '}
                <span className="text-gradient">Create.</span>{' '}
                <span className="text-foreground">Win.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Join India's premier trading community competitions. Showcase your skills in blogs, reels, and more.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/blog">
                  <Button size="lg" className="gap-2 h-12 px-8 text-base">
                    Explore Competitions
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="gap-2 h-12 px-8 text-base border-border/50 hover:bg-secondary/50">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-border/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Competitions Section */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Choose Your Arena
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Pick a competition that matches your skills and start competing today
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {competitions.map((comp, index) => (
                <Link 
                  key={comp.title} 
                  to={comp.status === 'active' ? comp.href : '#'}
                  className={comp.status !== 'active' ? 'cursor-not-allowed' : ''}
                >
                  <Card 
                    className={`h-full transition-all duration-500 animate-slide-up bg-gradient-to-br ${comp.gradient} border ${comp.borderColor} hover:scale-[1.02] hover:shadow-glow group relative overflow-hidden ${comp.status !== 'active' ? 'opacity-60' : ''}`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {comp.status === 'coming-soon' && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-warning/20 text-warning border-warning/30">Coming Soon</Badge>
                      </div>
                    )}
                    <CardContent className="p-8">
                      <div className={`w-14 h-14 rounded-xl ${comp.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <comp.icon className={`w-7 h-7 ${comp.iconColor}`} />
                      </div>
                      
                      <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                        {comp.title}
                      </h3>
                      
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                        {comp.description}
                      </p>

                      {comp.status === 'active' && (
                        <div className="flex items-center text-primary text-sm font-medium">
                          Enter Competition
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 via-primary/5 to-purple-500/10 border-primary/20 overflow-hidden relative">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
              <CardContent className="p-12 md:p-16 text-center relative">
                <Trophy className="w-12 h-12 mx-auto mb-6 text-primary" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  Ready to Compete?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                  Join thousands of traders and creators showcasing their skills and winning exciting prizes.
                </p>
                <Link to="/blog">
                  <Button size="lg" className="gap-2 h-12 px-8">
                    Start Competing Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
