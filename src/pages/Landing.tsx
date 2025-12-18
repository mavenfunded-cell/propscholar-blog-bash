import { useEffect, useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RocketLoader } from '@/components/RocketLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, PenTool, Video, Sparkles, ExternalLink, Coins, Gift, Award, BookOpen, ShoppingBag } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const competitions = [
  {
    title: 'Blog Competition',
    description:
      'Publish original insights on trading, psychology, and market structure. Quality is rewarded.',
    icon: PenTool,
    href: '/blog',
    status: 'active',
  },
  {
    title: 'Reel Competition',
    description:
      'Create short-form educational content that simplifies trading for the community.',
    icon: Video,
    href: '/reels',
    status: 'coming-soon',
  },
  {
    title: 'Quiz Challenge',
    description:
      'Compete through structured trading knowledge challenges and rankings.',
    icon: Sparkles,
    href: '#',
    status: 'coming-soon',
  },
];

const scrollToArena = () => {
  const element = document.getElementById('choose-your-arena');
  element?.scrollIntoView({ behavior: 'smooth' });
};

export default function Landing() {
  useSEO();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderComplete, setLoaderComplete] = useState(false);

  // Check if this is first visit in session
  useEffect(() => {
    const hasSeenLoader = sessionStorage.getItem('landing_loader_shown');
    if (hasSeenLoader) {
      setShowLoader(false);
      setLoaderComplete(true);
    }
  }, []);

  const handleLoaderComplete = useCallback(() => {
    setLoaderComplete(true);
    sessionStorage.setItem('landing_loader_shown', 'true');
    // Small delay for smooth transition
    setTimeout(() => setShowLoader(false), 100);
  }, []);

  // Optimized scroll reveal with 70% viewport trigger
  const setupScrollReveal = useCallback(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Instantly reveal all elements if reduced motion is preferred
      document.querySelectorAll('.scroll-reveal, .scroll-reveal-blur').forEach(el => {
        el.classList.add('revealed');
      });
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add revealed class and stop observing (animate once only)
            entry.target.classList.add('revealed');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.3, // Trigger at 30% visible (70% from bottom)
        rootMargin: '0px 0px -10% 0px',
      }
    );

    document.querySelectorAll('.scroll-reveal, .scroll-reveal-blur').forEach((el) => {
      observerRef.current?.observe(el);
    });
  }, []);

  useEffect(() => {
    setupScrollReveal();
    return () => observerRef.current?.disconnect();
  }, [setupScrollReveal]);

  // Show loader on first visit
  if (showLoader) {
    return <RocketLoader minDuration={2200} onComplete={handleLoaderComplete} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a] text-white">
      {/* ===== Premium Background ===== */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0b] to-[#0d0d0d]" />
        
        {/* Ambient glow - Perplexity style */}
        <div 
          className="ambient-glow" 
          style={{ top: '10%', left: '20%' }}
        />
        <div 
          className="ambient-glow ambient-glow-gold" 
          style={{ top: '60%', right: '10%', animationDelay: '-12s' }}
        />
        
        {/* Static grain overlay */}
        <div className="grain-overlay" />
      </div>

      <div className="relative z-10 pt-16">
        <Navbar />

        {/* ===== HERO ===== */}
        <section className="relative py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
        
              {/* Top label - Stagger 0 */}
              <p className="hero-fade-in delay-0 text-[11px] tracking-[0.32em] uppercase text-white/40 mb-6 font-medium">
                PropScholar Space
              </p>
        
              {/* Heading - Stagger 100ms */}
              <h1 className="hero-fade-in delay-100 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-center whitespace-normal md:whitespace-nowrap mb-6">
                You Compete.{" "}
                <span className="font-semibold">We Reward.</span>
              </h1>
        
              {/* Sub text - Stagger 200ms with blur */}
              <p className="hero-fade-in-blur delay-200 text-sm md:text-base text-white/55 max-w-lg mx-auto leading-relaxed font-light mb-10">
                PropScholar, the leading trading scholarship platform's Giveaway Hub
                where participants compete and win exciting rewards.
              </p>
        
              {/* CTAs - Stagger 300ms */}
              <div className="hero-fade-in delay-300 flex flex-wrap justify-center gap-4">
                <Button
                  onClick={scrollToArena}
                  className="btn-premium h-11 px-9 rounded-full bg-white/90 text-black hover:bg-white border-0 text-sm font-medium"
                >
                  Explore Competitions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
        
                <a
                  href="https://propscholar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="btn-premium h-11 px-9 rounded-full border-white/15 bg-white/[0.03] text-white/90 hover:bg-white/[0.06] hover:border-white/25 text-sm"
                  >
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
        
            </div>
          </div>
        </section>

        {/* ===== COMPETITIONS ===== */}
        <section id="choose-your-arena" className="py-28 md:py-36">
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="scroll-reveal text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Choose Your Arena
              </h2>
              <p className="scroll-reveal text-white/55 text-sm font-light" style={{ transitionDelay: '80ms' }}>
                Multiple formats. One standard of excellence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
              {competitions.map((comp, index) => {
                const isComingSoon = comp.status === 'coming-soon';

                return (
                  <Link
                    key={comp.title}
                    to={isComingSoon ? '#' : comp.href}
                    onClick={(e) => isComingSoon && e.preventDefault()}
                    className={`scroll-reveal ${isComingSoon ? 'cursor-not-allowed' : ''}`}
                    style={{ transitionDelay: `${(index + 1) * 100}ms` }}
                  >
                    <Card
                      className={`
                        relative h-full
                        bg-[#0f0f0f]/90
                        border border-white/[0.06]
                        overflow-hidden
                        ${
                          isComingSoon
                            ? ''
                            : 'transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#141414] hover:border-white/[0.1]'
                        }
                      `}
                    >
                      {/* COMING SOON OVERLAY */}
                      {isComingSoon && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-xl z-10">
                          <Badge className="px-5 py-2 bg-white/[0.06] text-white/70 border border-white/[0.1] tracking-widest text-xs uppercase">
                            Coming Soon
                          </Badge>
                        </div>
                      )}

                      <CardContent className="p-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-8">
                          <comp.icon className="w-6 h-6 text-white/60" />
                        </div>

                        <h3 className="text-lg font-medium mb-4 text-white/90">
                          {comp.title}
                        </h3>

                        <p className="text-white/45 text-sm leading-relaxed">
                          {comp.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== SPACE COINS REWARDS ===== */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="scroll-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/[0.08] border border-yellow-500/15 mb-6">
                <Coins className="w-4 h-4 text-yellow-500/80" />
                <span className="text-yellow-500/80 text-sm font-medium">Space Coins Rewards</span>
              </div>
              <h2 className="scroll-reveal text-3xl md:text-4xl font-semibold tracking-tight mb-4" style={{ transitionDelay: '80ms' }}>
                Get Rewards Through Space Coins
              </h2>
              <p className="scroll-reveal text-white/50 text-sm font-light max-w-lg mx-auto" style={{ transitionDelay: '160ms' }}>
                Earn coins by participating in competitions and redeem them for exclusive rewards
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {/* $10K Account */}
              <div className="scroll-reveal" style={{ transitionDelay: '200ms' }}>
                <Card className="h-full bg-[#0f0f0f]/90 border border-white/[0.06] hover:border-yellow-500/20 transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/[0.08] border border-yellow-500/15 flex items-center justify-center mb-4">
                      <Award className="w-6 h-6 text-yellow-500/80" />
                    </div>
                    <h3 className="text-lg font-medium text-white/90 mb-2">$10K Account</h3>
                    <p className="text-white/45 text-sm mb-4 flex-grow">Get a $10,000 funded trading account</p>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500/80" />
                      <span className="font-bold text-yellow-500/90">200 coins</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* $5K Account */}
              <div className="scroll-reveal" style={{ transitionDelay: '280ms' }}>
                <Card className="h-full bg-[#0f0f0f]/90 border border-white/[0.06] hover:border-green-500/20 transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/[0.08] border border-green-500/15 flex items-center justify-center mb-4">
                      <Gift className="w-6 h-6 text-green-500/80" />
                    </div>
                    <h3 className="text-lg font-medium text-white/90 mb-2">$5K Account</h3>
                    <p className="text-white/45 text-sm mb-4 flex-grow">Get a $5,000 funded trading account</p>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500/80" />
                      <span className="font-bold text-yellow-500/90">150 coins</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Journal */}
              <div className="scroll-reveal" style={{ transitionDelay: '360ms' }}>
                <Card className="h-full bg-[#0f0f0f]/90 border border-white/[0.06] hover:border-blue-500/20 transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/[0.08] border border-blue-500/15 flex items-center justify-center mb-4">
                      <BookOpen className="w-6 h-6 text-blue-500/80" />
                    </div>
                    <h3 className="text-lg font-medium text-white/90 mb-2">Trading Journal</h3>
                    <p className="text-white/45 text-sm mb-4 flex-grow">Premium journal to track your trades</p>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500/80" />
                      <span className="font-bold text-yellow-500/90">170 coins</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Merchandise Coming Soon */}
              <div className="scroll-reveal" style={{ transitionDelay: '440ms' }}>
                <Card className="h-full bg-[#0f0f0f]/90 border border-white/[0.06] relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm z-10">
                    <Badge className="px-4 py-2 bg-white/[0.06] text-white/70 border border-white/[0.1] tracking-widest text-xs uppercase">
                      Coming Soon
                    </Badge>
                  </div>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/[0.08] border border-purple-500/15 flex items-center justify-center mb-4">
                      <ShoppingBag className="w-6 h-6 text-purple-500/80" />
                    </div>
                    <h3 className="text-lg font-medium text-white/90 mb-2">Merchandise</h3>
                    <p className="text-white/45 text-sm mb-4 flex-grow">PropScholar branded merchandise</p>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-white/25" />
                      <span className="font-bold text-white/25">TBD</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="scroll-reveal text-center mt-12" style={{ transitionDelay: '500ms' }}>
              <Link to="/rewards">
                <Button className="btn-premium h-11 px-9 rounded-full bg-yellow-500/90 text-black hover:bg-yellow-500 border-0 text-sm font-medium">
                  Go to Rewards
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ===== PROPSCHOLAR INVITATION ===== */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Main Content */}
              <div className="scroll-reveal text-center mb-16">
                <p className="text-[11px] tracking-[0.32em] uppercase text-white/35 mb-6 font-medium">
                  Industry Leading Scholarship Model
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-6">
                  Turn Skill Into <span className="font-semibold">Opportunity</span>
                </h2>
                <p className="text-white/50 text-base font-light max-w-xl mx-auto leading-relaxed">
                  PropScholar's trading scholarship model empowers talented traders to access funded accounts and build their careers.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="scroll-reveal grid grid-cols-2 md:grid-cols-4 gap-6 mb-16" style={{ transitionDelay: '100ms' }}>
                <div className="text-center p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
                  <p className="text-2xl md:text-3xl font-semibold text-white/90 mb-1">$5</p>
                  <p className="text-xs text-white/35 uppercase tracking-wider">Start With</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
                  <p className="text-2xl md:text-3xl font-semibold text-white/90 mb-1">3000+</p>
                  <p className="text-xs text-white/35 uppercase tracking-wider">Traders</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
                  <p className="text-2xl md:text-3xl font-semibold text-white/90 mb-1">4 Hrs</p>
                  <p className="text-xs text-white/35 uppercase tracking-wider">Payout Time</p>
                </div>
                <div className="text-center p-6 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
                  <p className="text-2xl md:text-3xl font-semibold text-white/90 mb-1">#1</p>
                  <p className="text-xs text-white/35 uppercase tracking-wider">Scholarship Model</p>
                </div>
              </div>

              {/* CTA */}
              <div className="scroll-reveal text-center" style={{ transitionDelay: '200ms' }}>
                <a
                  href="https://propscholar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="btn-premium h-12 px-10 rounded-full bg-white/90 text-black hover:bg-white border-0 text-sm font-medium">
                    Join PropScholar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <p className="mt-6 text-xs text-white/25">
                  Leading Trading Scholarship Platform
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-32 md:py-40">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="scroll-reveal bg-[#0f0f0f]/90 border border-white/[0.06]">
                <CardContent className="p-16 md:p-20">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-white/95">
                    Ready to Compete?
                  </h2>
                  <p className="text-white/45 text-sm font-light mb-12">
                    Performance deserves visibility. Step into the arena.
                  </p>

                  <Button 
                    onClick={scrollToArena}
                    className="btn-premium h-12 px-12 rounded-full bg-white text-black hover:bg-white/95 border-0"
                  >
                    Start Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
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
