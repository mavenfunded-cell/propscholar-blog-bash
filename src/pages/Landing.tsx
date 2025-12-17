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

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#090909] text-white">
      {/* ===== Background ===== */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090909] via-[#0b0b0b] to-[#101010]" />

        {/* Soft white blobs */}
        <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-white/6 rounded-full blur-[200px]" />
        <div className="absolute bottom-[-300px] right-[-200px] w-[700px] h-[700px] bg-white/4 rounded-full blur-[220px]" />

        {/* Grain */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ===== HERO ===== */}
        <section className="relative py-40 md:py-52">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-xs tracking-[0.35em] uppercase text-white/50 mb-10 font-medium">
                PropScholar Space
              </p>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold leading-[1.05] tracking-tight mb-10">
                Participate. Create.
                <br />
                <span className="text-white">We Reward Excellence.</span>
              </h1>

              <p className="text-base md:text-lg text-white/65 max-w-2xl mx-auto leading-relaxed font-light mb-16">
                A premium competition platform where traders are recognized for
                skill, clarity, and consistency — not noise.
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                <Link to="/blog">
                  <Button className="h-14 px-12 rounded-full bg-white/90 text-black hover:bg-white transition-all backdrop-blur-md shadow-xl shadow-black/40">
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
                    className="h-14 px-12 rounded-full border-white/20 text-white hover:bg-white/5 backdrop-blur-md transition-all"
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
        <section className="py-28 md:py-36">
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Choose Your Arena
              </h2>
              <p className="text-white/60 text-sm font-light">
                Multiple formats. One standard of quality.
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
                    <Card className="h-full bg-white/5 backdrop-blur-xl border border-white/15 transition-all duration-500 hover:-translate-y-1 hover:bg-white/10 hover:shadow-2xl hover:shadow-black/40 relative overflow-hidden">
                      {isComingSoon && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                          <Badge className="bg-white/10 text-white/70 border-white/20">
                            Coming Soon
                          </Badge>
                        </div>
                      )}

                      <CardContent className="p-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8">
                          <comp.icon className="w-6 h-6 text-white/80" />
                        </div>

                        <h3 className="text-lg font-medium mb-4">
                          {comp.title}
                        </h3>

                        <p className="text-white/65 text-sm leading-relaxed">
                          {comp.description}
                        </p>

                        {!isComingSoon && (
                          <div className="flex items-center text-white text-sm font-medium mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* ===== CTA ===== */}
        <section className="py-32 md:py-40">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="bg-white/6 backdrop-blur-xl border border-white/15">
                <CardContent className="p-16 md:p-20">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                    Ready to Participate?
                  </h2>
                  <p className="text-white/65 text-sm font-light mb-12">
                    Your work deserves visibility. Compete with purpose.
                  </p>

                  <Link to="/blog">
                    <Button className="h-12 px-12 rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-xl shadow-black/40">
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
