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
    description:
      'Showcase your writing skills and share insights on trading, finance, and market analysis.',
    icon: PenTool,
    href: '/blog',
    status: 'active',
  },
  {
    title: 'Reel Competition',
    description:
      'Create engaging video content about trading strategies and financial education.',
    icon: Video,
    href: '/reels',
    status: 'coming-soon',
  },
  {
    title: 'Quiz Challenge',
    description:
      'Test your trading knowledge and compete with others in interactive quiz competitions.',
    icon: Sparkles,
    href: '#',
    status: 'coming-soon',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#090909] text-white">
      {/* ===== Background Layers ===== */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090909] via-[#0b0b0b] to-[#101010]" />

        {/* Primary glow */}
        <div className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-primary/10 rounded-full blur-[200px]" />

        {/* Secondary glow */}
        <div className="absolute bottom-[-300px] right-[-200px] w-[700px] h-[700px] bg-white/5 rounded-full blur-[220px]" />

        {/* Grain overlay (BUILD SAFE) */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ===== Hero Section ===== */}
        <section className="relative py-36 md:py-48">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <p className="text-xs tracking-[0.4em] uppercase text-white/60 mb-10 font-medium">
                PropScholar Space
              </p>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold leading-[1.05] tracking-tight mb-12">
                Compete. Create.
                <br />
                <span className="text-primary">Win.</span>
              </h1>

              <p className="text-base md:text-lg text-white/70 max-w-xl mx-auto leading-relaxed font-light mb-16">
                A premium competition space built for traders who think long term.
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                <Link to="/blog">
                  <Button className="h-14 px-12 rounded-full bg-white text-black hover:bg-white/90 shadow-xl shadow-black/40">
                    Explore Competitions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <a
                  href="https://propscholar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="h-14 px-12 rounded-full border-white/15 text-white hover:border-white/30 hover:bg-white/5 backdrop-blur-md"
                  >
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Competitions ===== */}
        <section className="py-28 md:py-36">
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4">
                Choose Your Arena
              </h2>
              <p className="text-white/60 text-sm">
                Different formats. Same standard of excellence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
              {competitions.map((comp) => {
                const isComingSoon = comp.status === 'coming-soon';

                return (
                  <Link
                    key={comp.title}
                    to={isComingSoon ? '#' : comp.href}
                    onClick={(e) => isComingSoon && e.preventDefault()}
                    className={isComingSoon ? 'cursor-not-allowed' : ''}
                  >
                    <Card className="h-full bg-[#111111]/70 border border-white/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40">
                      {isComingSoon && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10">
                          <Badge className="bg-white/10 text-white/70 border-white/15">
                            Coming Soon
                          </Badge>
                        </div>
                      )}

                      <CardContent className="p-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
                          <comp.icon className="w-6 h-6 text-white/80" />
                        </div>

                        <h3 className="text-lg font-medium mb-4">
                          {comp.title}
                        </h3>

                        <p className="text-white/60 text-sm leading-relaxed">
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

        <Footer />
      </div>
    </div>
  );
}
