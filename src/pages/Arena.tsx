import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PenTool, Video, Sparkles, ArrowLeft } from 'lucide-react';

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

export default function Arena() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0b] to-[#0d0d0d]" />
        <div className="grain-overlay" />
      </div>

      <div className="relative z-10 pt-16">
        <Navbar />

        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            {/* Back Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-12 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            {/* Header */}
            <div className="text-center mb-20">
              <p className="text-[11px] tracking-[0.32em] uppercase text-white/30 mb-4 font-medium">
                Competitions
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
                Choose Your Arena
              </h1>
              <p className="text-white/55 text-sm font-light max-w-md mx-auto">
                Multiple formats. One standard of excellence.
              </p>
            </div>

            {/* Competition Cards */}
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

        <Footer />
      </div>
    </div>
  );
}
