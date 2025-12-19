import { useEffect, useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { PropScholarInvitation } from '@/components/PropScholarInvitation';
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
  Rocket,
  Star,
  Zap
} from 'lucide-react';

export default function About() {
  useSEO();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Track mouse for parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#050505] to-[#080808]" />
        
        {/* Animated star field */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[2px] bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        {/* Floating orbs with parallax */}
        <div 
          className="absolute top-[10%] left-[15%] w-[600px] h-[600px] rounded-full bg-white/[0.015] blur-[120px]"
          style={{
            transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`
          }}
        />
        <div 
          className="absolute top-[50%] right-[10%] w-[500px] h-[500px] rounded-full bg-white/[0.01] blur-[100px]"
          style={{
            transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * -15}px)`
          }}
        />
        <div 
          className="absolute bottom-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-white/[0.008] blur-[80px]"
          style={{
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`
          }}
        />
        
        <div className="grain-overlay" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ===== HERO SECTION ===== */}
        <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Animated geometric background */}
          <div className="absolute inset-0">
            {/* Rotating ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
              <div 
                className="absolute inset-0 rounded-full border border-white/[0.03]"
                style={{ animation: 'spin 60s linear infinite' }}
              />
              <div 
                className="absolute inset-8 rounded-full border border-white/[0.05]"
                style={{ animation: 'spin 45s linear infinite reverse' }}
              />
              <div 
                className="absolute inset-16 rounded-full border border-dashed border-white/[0.04]"
                style={{ animation: 'spin 30s linear infinite' }}
              />
            </div>
            
            {/* Floating particles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animation: `float ${4 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`
                }}
              />
            ))}
          </div>

          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Animated badge */}
              <div className="hero-fade-in delay-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8 backdrop-blur-sm group hover:border-white/[0.15] transition-all duration-500 cursor-default">
                <div className="relative">
                  <Rocket className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" />
                  <div className="absolute inset-0 blur-sm bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-sm text-white/60 tracking-wide group-hover:text-white/80 transition-colors">PropScholar Space</span>
                <Sparkles className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
              </div>

              {/* Main headline with stagger */}
              <h1 className="hero-fade-in delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-8 leading-[1.1]">
                <span className="inline-block hover:translate-y-[-2px] transition-transform duration-300">The Space Where Traders</span>
                <br />
                <span className="inline-block font-semibold text-white hover:tracking-wide transition-all duration-300">
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
                  <Button className="btn-premium h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 border-0 text-sm font-medium group">
                    Explore Events
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="https://propscholar.com" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="btn-premium h-12 px-8 rounded-full border-white/10 bg-transparent text-white hover:bg-white/5 hover:border-white/20 text-sm group">
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Animated scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2 hover:border-white/40 transition-colors cursor-pointer group">
              <div className="w-1 h-2 bg-white/40 rounded-full animate-bounce group-hover:bg-white/60 transition-colors" />
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

              {/* Animated visual instead of image */}
              <div className="scroll-reveal relative" style={{ transitionDelay: '150ms' }}>
                <div className="relative aspect-square max-w-[400px] mx-auto">
                  {/* Orbiting rings */}
                  <div className="absolute inset-0">
                    <div 
                      className="absolute inset-0 rounded-full border border-white/[0.08]"
                      style={{ animation: 'spin 20s linear infinite' }}
                    />
                    <div 
                      className="absolute inset-8 rounded-full border border-white/[0.12]"
                      style={{ animation: 'spin 15s linear infinite reverse' }}
                    />
                    <div 
                      className="absolute inset-16 rounded-full border border-dashed border-white/[0.08]"
                      style={{ animation: 'spin 25s linear infinite' }}
                    />
                  </div>
                  
                  {/* Center element */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative group cursor-default">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                        <Rocket className="w-12 h-12 text-white/60 group-hover:text-white/80 transition-colors" />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-white/5 blur-xl group-hover:bg-white/10 transition-colors" />
                    </div>
                  </div>
                  
                  {/* Orbiting icons */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ animation: 'orbit 20s linear infinite' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-white/50" />
                    </div>
                  </div>
                  <div 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                    style={{ animation: 'orbit 20s linear infinite', animationDelay: '-10s' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white/50" />
                    </div>
                  </div>
                </div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-white/[0.02] rounded-full blur-3xl -z-10" />
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
              {[
                { icon: BookOpen, title: 'Learning First', desc: 'Structured blogs, educational content, and community driven knowledge designed to improve trader mindset and skill.' },
                { icon: Trophy, title: 'Real Competitions', desc: 'Regular trading and content competitions where performance, effort, and creativity are rewarded transparently.' },
                { icon: Gift, title: 'Rewards That Matter', desc: 'Earn coins, unlock rewards, and access benefits that directly support your trading journey.' },
                { icon: Users, title: 'Community Powered', desc: 'Connected directly with our Discord and ecosystem, ensuring real people, real feedback, and real engagement.' }
              ].map((item, index) => (
                <div 
                  key={item.title}
                  className="scroll-reveal group cursor-default" 
                  style={{ transitionDelay: `${100 + index * 100}ms` }}
                >
                  <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.1)]">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-300">
                      <item.icon className="w-7 h-7 text-white/60 group-hover:text-white/80 transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-white/90 mb-3 group-hover:text-white transition-colors">{item.title}</h3>
                    <p className="text-sm text-white/45 leading-relaxed group-hover:text-white/55 transition-colors">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
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
                  <div className="relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500 group hover:-translate-y-1">
                    <div className="absolute -top-3 left-8">
                      <span className="px-3 py-1 text-xs font-medium bg-white/[0.06] text-white/70 rounded-full border border-white/[0.12] group-hover:bg-white/[0.1] transition-colors">
                        propscholar.com
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-white/90 mb-3 group-hover:text-white transition-colors">Challenges & Evaluations</h3>
                      <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/60 transition-colors">
                        Where your trading journey begins. Take evaluations, prove your skills, and access funded accounts.
                      </p>
                    </div>
                  </div>

                  {/* PropScholar Space */}
                  <div className="relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500 group hover:-translate-y-1">
                    <div className="absolute -top-3 left-8">
                      <span className="px-3 py-1 text-xs font-medium bg-white/[0.06] text-white/70 rounded-full border border-white/[0.12] group-hover:bg-white/[0.1] transition-colors">
                        propscholar.space
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-white/90 mb-3 group-hover:text-white transition-colors">Learning & Community</h3>
                      <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/60 transition-colors">
                        Where growth happens. Learn, compete, earn rewards, and connect with fellow traders.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Animated connector */}
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-[2px]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    style={{ animation: 'pulse 2s ease-in-out infinite' }}
                  />
                </div>
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/20 flex items-center justify-center hover:scale-110 hover:border-white/40 transition-all duration-300 cursor-default group">
                    <Sparkles className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" />
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
              {[
                { icon: Shield, title: 'Built by PropScholar', subtitle: 'Official team development' },
                { icon: Calendar, title: 'Active Since 2024', subtitle: 'Established presence' },
                { icon: Eye, title: 'Transparent Rules', subtitle: 'Clear systems & policies' },
                { icon: Heart, title: 'Community Driven', subtitle: 'Growth through engagement' }
              ].map((item, index) => (
                <div 
                  key={item.title}
                  className="scroll-reveal text-center p-6 group cursor-default hover:-translate-y-1 transition-transform duration-300" 
                  style={{ transitionDelay: `${100 + index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-white/[0.08] group-hover:border-white/[0.15] transition-all duration-300">
                    <item.icon className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" />
                  </div>
                  <p className="text-sm text-white/70 font-medium mb-1 group-hover:text-white/90 transition-colors">{item.title}</p>
                  <p className="text-xs text-white/40 group-hover:text-white/50 transition-colors">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PREMIUM INVITATION CARD CTA ===== */}
        <section className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="scroll-reveal max-w-2xl mx-auto">
              {/* Premium Invitation Card */}
              <div className="relative group">
                {/* Outer glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                {/* Card */}
                <div className="relative p-1 rounded-3xl bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent">
                  <div className="relative bg-[#0a0a0a] rounded-[22px] p-10 md:p-14 overflow-hidden">
                    {/* Corner decorations */}
                    <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-white/20 rounded-tl-lg" />
                    <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-white/20 rounded-tr-lg" />
                    <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-white/20 rounded-bl-lg" />
                    <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-white/20 rounded-br-lg" />
                    
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                      backgroundSize: '32px 32px'
                    }} />
                    
                    {/* Floating particles inside card */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-white/20 rounded-full"
                          style={{
                            left: `${15 + Math.random() * 70}%`,
                            top: `${15 + Math.random() * 70}%`,
                            animation: `float ${5 + i}s ease-in-out infinite`,
                            animationDelay: `${i * 0.8}s`
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 text-center">
                      {/* Invitation header */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
                        <Star className="w-3 h-3 text-white/50" />
                        <span className="text-[10px] tracking-[0.25em] uppercase text-white/50">Exclusive Invitation</span>
                        <Star className="w-3 h-3 text-white/50" />
                      </div>
                      
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-3">
                        Enter the Space.
                      </h2>
                      <h3 className="text-2xl md:text-3xl font-semibold text-white mb-8">
                        Grow With PropScholar.
                      </h3>
                      
                      <p className="text-white/45 text-sm md:text-base mb-10 max-w-md mx-auto leading-relaxed">
                        Join a community of traders who are learning, competing, and earning together. Your journey to growth starts here.
                      </p>

                      {/* Divider */}
                      <div className="flex items-center gap-4 mb-10">
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/20" />
                        <Rocket className="w-5 h-5 text-white/40" />
                        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/20" />
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/blog">
                          <Button className="btn-premium w-full sm:w-auto h-12 px-10 rounded-full bg-white text-black hover:bg-white/90 border-0 text-sm font-medium group">
                            Explore Events
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                        <a href="https://propscholar.com" target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="btn-premium w-full sm:w-auto h-12 px-10 rounded-full border-white/15 bg-white/[0.03] text-white/90 hover:bg-white/[0.08] hover:border-white/25 text-sm group">
                            Visit PropScholar.com
                            <ExternalLink className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PropScholar Invitation Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <PropScholarInvitation />
            </div>
          </div>
        </section>

        <Footer />
      </div>
      
      {/* Custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-15px) translateX(3px); }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(180px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(180px) rotate(-360deg); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
