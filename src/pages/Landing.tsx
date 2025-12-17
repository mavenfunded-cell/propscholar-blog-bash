import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a] text-white">
      {/* ===== CLEAN BACKGROUND ===== */}
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

        {/* ===== HERO ===== */}
        <section className="relative py-40 md:py-52">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              <p className="text-xs tracking-[0.35em] uppercase text-white/50 mb-10 font-medium">
                PropScholar Space
              </p>

              {/* FORCE SINGLE LINE ON DESKTOP */}
              <h1 className="
                text-5xl md:text-7xl lg:text-8xl
                font-light tracking-tight mb-10
                whitespace-normal md:whitespace-nowrap
              ">
                You Win, <span className="font-semibold">We Reward.</span>
              </h1>

              <p className="text-base md:text-lg text-white/65 max-w-2xl mx-auto leading-relaxed font-light mb-16">
                A premium competition platform where performance, clarity,
                and consistency are recognized.
              </p>

              <div className="flex flex-wrap justify-center gap-6">
                <Link to="/blog">
                  <Button className="
                    h-14 px-12 rounded-full
                    bg-white/90 text-black
                    hover:bg-white
                    transition-colors
                    shadow-xl shadow-black/40
                  ">
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
                    className="
                      h-14 px-12 rounded-full
                      border border-white/20
                      bg-white/[0.02]
                      text-white
                      hover:bg-white/[0.06]
                      transition-colors
                      backdrop-blur-md
                    "
                  >
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2 opacity-70" />
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
                Multiple formats. One standard of excellence.
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
                    <Card
                      className={`
                        relative h-full
                        bg-white/[0.04]
                        border border-white/10
                        ${
                          isComingSoon
                            ? 'opacity-60'
                            : 'transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-black/40'
                        }
                      `}
                    >
                      {/* CLEAN COMING SOON LABEL */}
                      {isComingSoon && (
                        <div className="absolute top-6 right-6 z-10">
                          <span className="
                            px-3 py-1.5 text-xs
                            rounded-full
                            bg-black/60
                            border border-white/20
                            text-white/70
                            backdrop-blur-sm
                            tracking-wide
                          ">
                            Coming Soon
                          </span>
                        </div>
                      )}

                      <CardContent className="p-10">
                        <div className="
                          w-12 h-12 rounded-2xl
                          bg-white/10
                          border border-white/20
                          flex items-center justify-center mb-8
                        ">
                          <comp.icon className="w-6 h-6 text-white/85" />
                        </div>

                        <h3 className="text-lg font-medium mb-4">
                          {comp.title}
                        </h3>

                        <p className="text-white/65 text-sm leading-relaxed">
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

        {/* ===== CTA ===== */}
        <section className="py-32 md:py-40">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="bg-white/[0.06] border border-white/15">
                <CardContent className="p-16 md:p-20">
                  <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                    Ready to Compete?
                  </h2>
                  <p className="text-white/65 text-sm font-light mb-12">
                    Performance deserves visibility. Step into the arena.
                  </p>

                  <Link to="/blog">
                    <Button className="
                      h-12 px-12 rounded-full
                      bg-white text-black
                      hover:bg-white/90
                      transition-colors
                      shadow-xl shadow-black/40
                    ">
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
