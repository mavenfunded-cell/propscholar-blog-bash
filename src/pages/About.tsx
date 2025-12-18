import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { 
  ArrowRight, 
  BookOpen, 
  Trophy, 
  Gift, 
  Users, 
  Shield, 
  Calendar, 
  Eye, 
  Heart,
  ExternalLink,
  Sparkles,
  Rocket
} from 'lucide-react';
import spaceHero from '@/assets/space-hero.jpg';
import spaceGalaxy from '@/assets/space-galaxy.jpg';

export default function About() {
  useSEO();

  const observerRef = useRef<IntersectionObserver | null>(null);

  const setupScrollReveal = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      document.querySelectorAll('.scroll-reveal, .scroll-reveal-blur').forEach(el => {
        el.classList.add('revealed');
      });
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );

    document.querySelectorAll('.scroll-reveal, .scroll-reveal-blur').forEach((el) => {
      observerRef.current?.observe(el);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setupScrollReveal(), 100);
    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [setupScrollReveal]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030303] text-white">
      {/* Premium Dark Background with Space */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#050505] to-[#080808]" />
        
        {/* Space image overlay */}
        <img 
          src={spaceHero} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.08] grayscale"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/60 via-[#030303]/80 to-[#030303]" />
        
        {/* Subtle ambient glow - monochrome */}
        <div className="absolute top-[10%] left-[15%] w-[600px] h-[600px] rounded-full bg-white/[0.012] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[50%] right-[10%] w-[500px] h-[500px] rounded-full bg-white/[0.008] blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        
        {/* Star field effect - more subtle */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, white, transparent),
                           radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.6), transparent),
                           radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.4), transparent),
                           radial-gradient(1px 1px at 90px 40px, white, transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.5), transparent),
                           radial-gradient(1px 1px at 160px 120px, white, transparent)`,
          backgroundSize: '200px 200px'
        }} />
        
        <div className="grain-overlay" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ===== HERO SECTION ===== */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          {/* Hero background image with overlay */}
          <div className="absolute inset-0">
            <img 
              src={spaceHero} 
              alt="Space background" 
              className="w-full h-full object-cover opacity-20 grayscale"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/70 via-[#030303]/85 to-[#030303]" />
          </div>

          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Animated badge */}
              <div className="hero-fade-in delay-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
                <Rocket className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60 tracking-wide">PropScholar Space</span>
              </div>

              {/* Main headline */}
              <h1 className="hero-fade-in delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-8 leading-[1.1]">
                The Space Where Traders
                <br />
                <span className="font-semibold text-white">
                  Grow Beyond Limits
                </span>
              </h1>

              {/* Subheading */}
              <p className="hero-fade-in-blur delay-200 text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
                PropScholar Space is where learning, competition, rewards, and community come together. 
                Built to empower traders beyond challenges and accounts.
              </p>

              {/* CTA buttons */}
              <div className="hero-fade-in delay-300 flex flex-wrap justify-center gap-4">
                <Link to="/blog">
                  <Button className="btn-premium h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 border-0 text-sm font-medium">
                    Explore Events
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="https://propscholar.com" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="btn-premium h-12 px-8 rounded-full border-white/10 bg-transparent text-white hover:bg-white/5 hover:border-white/20 text-sm">
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-white/40 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* ===== WHAT IS PROPSCHOLAR SPACE ===== */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
              {/* Text content */}
              <div className="scroll-reveal">
                <p className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-4">
                  About The Platform
                </p>
                <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-6">
                  What Is <span className="font-semibold">PropScholar Space</span>
                </h2>
                <div className="space-y-4 text-white/55 leading-relaxed">
                  <p>
                    PropScholar Space is an extension of the PropScholar ecosystem. While propscholar.com 
                    focuses on evaluations and trading opportunities, PropScholar Space is designed for 
                    growth, engagement, and long-term trader development.
                  </p>
                  <p>
                    It is the platform where traders learn, compete, earn rewards, and participate in 
                    exclusive events. Everything here is created to support serious traders who want 
                    more than just access to capital.
                  </p>
                </div>
              </div>

              {/* Image */}
              <div className="scroll-reveal relative" style={{ transitionDelay: '150ms' }}>
                <div className="relative rounded-3xl overflow-hidden border border-white/[0.08]">
                  <img 
                    src={spaceGalaxy} 
                    alt="Galaxy visualization" 
                    className="w-full h-[400px] object-cover grayscale opacity-80"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-black/40" />
                  
                  {/* Floating elements */}
                  <div className="absolute top-6 right-6 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                    <span className="text-sm text-white/70">🚀 Launch Your Journey</span>
                  </div>
                </div>
                
                {/* Glow effect - monochrome */}
                <div className="absolute -inset-4 bg-white/[0.02] rounded-3xl blur-2xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHY PROPSCHOLAR SPACE EXISTS ===== */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <p className="scroll-reveal text-[11px] tracking-[0.3em] uppercase text-white/40 mb-4">
                Our Purpose
              </p>
              <h2 className="scroll-reveal text-3xl md:text-4xl font-light tracking-tight" style={{ transitionDelay: '80ms' }}>
                Why PropScholar Space <span className="font-semibold">Exists</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* Card 1 */}
              <div className="scroll-reveal group" style={{ transitionDelay: '100ms' }}>
                <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-7 h-7 text-white/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3">Learning First</h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    Structured blogs, educational content, and community driven knowledge designed to improve trader mindset and skill.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="scroll-reveal group" style={{ transitionDelay: '200ms' }}>
                <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="w-7 h-7 text-white/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3">Real Competitions</h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    Regular trading and content competitions where performance, effort, and creativity are rewarded transparently.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="scroll-reveal group" style={{ transitionDelay: '300ms' }}>
                <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Gift className="w-7 h-7 text-white/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3">Rewards That Matter</h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    Earn coins, unlock rewards, and access benefits that directly support your trading journey.
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="scroll-reveal group" style={{ transitionDelay: '400ms' }}>
                <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-7 h-7 text-white/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-3">Community Powered</h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    Connected directly with our Discord and ecosystem, ensuring real people, real feedback, and real engagement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== HOW SPACE CONNECTS TO PROPSCHOLAR ===== */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <p className="scroll-reveal text-[11px] tracking-[0.3em] uppercase text-white/40 mb-4">
                  The Connection
                </p>
                <h2 className="scroll-reveal text-3xl md:text-4xl font-light tracking-tight mb-6" style={{ transitionDelay: '80ms' }}>
                  How Space Connects to <span className="font-semibold">PropScholar</span>
                </h2>
              </div>

              {/* Timeline/Flow */}
              <div className="scroll-reveal relative" style={{ transitionDelay: '150ms' }}>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* PropScholar.com */}
                  <div className="relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08]">
                    <div className="absolute -top-3 left-8">
                      <span className="px-3 py-1 text-xs font-medium bg-white/[0.06] text-white/70 rounded-full border border-white/[0.12]">
                        propscholar.com
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-white/90 mb-3">Challenges & Evaluations</h3>
                      <p className="text-sm text-white/50 leading-relaxed">
                        Where your trading journey begins. Take evaluations, prove your skills, and access funded accounts.
                      </p>
                    </div>
                  </div>

                  {/* PropScholar Space */}
                  <div className="relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08]">
                    <div className="absolute -top-3 left-8">
                      <span className="px-3 py-1 text-xs font-medium bg-white/[0.06] text-white/70 rounded-full border border-white/[0.12]">
                        propscholar.space
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-white/90 mb-3">Learning & Community</h3>
                      <p className="text-sm text-white/50 leading-relaxed">
                        Where growth happens. Learn, compete, earn rewards, and connect with fellow traders.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connector line - monochrome */}
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-[2px] bg-gradient-to-r from-white/20 via-white/40 to-white/20" />
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 rounded-full bg-[#0a0a12] border border-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white/60" />
                  </div>
                </div>
              </div>

              {/* Summary text */}
              <p className="scroll-reveal text-center text-white/45 text-sm mt-12 max-w-xl mx-auto leading-relaxed" style={{ transitionDelay: '250ms' }}>
                This separation ensures focus, clarity, and a better experience for traders at every stage of their journey.
              </p>
            </div>
          </div>
        </section>

        {/* ===== TRUST & TRANSPARENCY ===== */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <p className="scroll-reveal text-[11px] tracking-[0.3em] uppercase text-white/40 mb-4">
                Our Foundation
              </p>
              <h2 className="scroll-reveal text-3xl md:text-4xl font-light tracking-tight" style={{ transitionDelay: '80ms' }}>
                Trust & <span className="font-semibold">Transparency</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="scroll-reveal text-center p-6" style={{ transitionDelay: '100ms' }}>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-white/70 font-medium mb-1">Built by PropScholar</p>
                <p className="text-xs text-white/40">Official team development</p>
              </div>

              <div className="scroll-reveal text-center p-6" style={{ transitionDelay: '200ms' }}>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-white/70 font-medium mb-1">Active Since 2024</p>
                <p className="text-xs text-white/40">Established presence</p>
              </div>

              <div className="scroll-reveal text-center p-6" style={{ transitionDelay: '300ms' }}>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-white/70 font-medium mb-1">Transparent Rules</p>
                <p className="text-xs text-white/40">Clear systems & policies</p>
              </div>

              <div className="scroll-reveal text-center p-6" style={{ transitionDelay: '400ms' }}>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-5 h-5 text-white/60" />
                </div>
                <p className="text-sm text-white/70 font-medium mb-1">Community Driven</p>
                <p className="text-xs text-white/40">Growth through engagement</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA SECTION ===== */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="scroll-reveal max-w-3xl mx-auto text-center relative">
              {/* Glow effect - monochrome */}
              <div className="absolute inset-0 bg-white/[0.02] blur-3xl rounded-full -z-10" />
              
              <p className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-6">
                Ready to Begin?
              </p>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-6">
                Enter the Space.
                <br />
                <span className="font-semibold">Grow With PropScholar.</span>
              </h2>
              
              <p className="text-white/45 text-base mb-10 max-w-lg mx-auto">
                Join a community of traders who are learning, competing, and earning together.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/blog">
                  <Button className="btn-premium h-12 px-10 rounded-full bg-white text-black hover:bg-white/90 border-0 text-sm font-medium">
                    Explore Events
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="https://propscholar.com" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="btn-premium h-12 px-10 rounded-full border-white/15 bg-white/[0.03] text-white/90 hover:bg-white/[0.06] hover:border-white/25 text-sm">
                    Visit PropScholar.com
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
