import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, PenTool, Video, Sparkles, ExternalLink } from 'lucide-react';

const competitions = [
  {
    title: 'Blog Competition',
    description: 'Showcase your writing skills and share insights on trading, finance, and market analysis.',
    icon: PenTool,
    href: '/blog',
    status: 'active',
  },
  {
    title: 'Reel Competition',
    description: 'Create engaging video content about trading strategies and financial education.',
    icon: Video,
    href: '/reels',
    status: 'coming-soon',
  },
  {
    title: 'Quiz Challenge',
    description: 'Test your trading knowledge and compete with others in interactive quiz competitions.',
    icon: Sparkles,
    href: '#',
    status: 'coming-soon',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero Section - Apple style minimal */}
        <section className="relative py-32 md:py-44">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-medium">
                PropScholar Space
              </p>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold mb-8 leading-[1.1] tracking-tight text-foreground">
                Compete. Create.
                <br />
                <span className="text-primary">Win.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed font-light">
                Join India's premier trading community competitions.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/blog">
                  <Button 
                    size="lg" 
                    className="h-14 px-8 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all"
                  >
                    Explore Competitions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="https://propscholar.com" target="_blank" rel="noopener noreferrer">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="h-14 px-8 text-base font-medium rounded-full glass-button border-border/40 hover:border-border/60"
                  >
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Competitions Section */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground tracking-tight">
                Choose Your Arena
              </h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto font-light">
                Pick a competition that matches your skills
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {competitions.map((comp, index) => {
                const isComingSoon = comp.status === 'coming-soon';
                
                return (
                  <Link 
                    key={comp.title} 
                    to={isComingSoon ? '#' : comp.href}
                    className={isComingSoon ? 'cursor-not-allowed' : ''}
                    onClick={(e) => isComingSoon && e.preventDefault()}
                  >
                    <Card 
                      className={`h-full transition-all duration-300 animate-slide-up bg-card/50 backdrop-blur-sm border-border/30 hover:border-border/50 group relative overflow-hidden ${isComingSoon ? 'opacity-50 blur-[1px]' : 'hover:bg-card/70'}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {isComingSoon && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60 backdrop-blur-sm">
                          <Badge className="bg-secondary text-muted-foreground border-border/50 text-xs font-medium">
                            Coming Soon
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-8">
                        <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6 group-hover:bg-secondary/80 transition-colors">
                          <comp.icon className="w-6 h-6 text-foreground/70" />
                        </div>
                        
                        <h3 className="text-lg font-medium mb-3 text-foreground group-hover:text-primary transition-colors">
                          {comp.title}
                        </h3>
                        
                        <p className="text-muted-foreground text-sm leading-relaxed font-light">
                          {comp.description}
                        </p>

                        {!isComingSoon && (
                          <div className="flex items-center text-primary text-sm font-medium mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            Enter
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section - Minimal */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="bg-secondary/30 border-border/20 backdrop-blur-sm">
                <CardContent className="p-12 md:p-16">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-foreground tracking-tight">
                    Ready to Compete?
                  </h2>
                  <p className="text-muted-foreground text-base mb-8 font-light">
                    Start showcasing your skills and win exciting prizes.
                  </p>
                  <Link to="/blog">
                    <Button 
                      size="lg" 
                      className="h-12 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90"
                    >
                      Start Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
