import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { ArrowRight, TrendingUp, Users, Clock, Zap } from 'lucide-react';

export default function About() {
  useSEO();

  return (
    <div className="min-h-screen relative bg-[#0a0a0a] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0c0c] to-[#101010]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <p className="text-xs tracking-[0.35em] uppercase text-white/50 mb-6 font-medium">
                PropScholar Space
              </p>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
                About <span className="font-semibold">Us</span>
              </h1>
              <p className="text-white/60 text-base leading-relaxed">
                Learn more about PropScholar and our mission.
              </p>
            </div>

            {/* Content */}
            <div className="space-y-12 text-white/70 leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">Who We Are</h2>
                <p>
                  PropScholar is a government-registered business under the MSME (Udyam) initiative in India. 
                  We are an educational platform designed to assess and develop trading skills in a simulated environment.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">Our Mission</h2>
                <p>
                  Our mission is to identify and nurture trading talent through skill-based evaluations. 
                  We believe that consistent performance and disciplined trading deserve recognition and reward.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">What We Do</h2>
                <p className="mb-4">
                  PropScholar Space is our premium competition platform where traders can showcase their abilities 
                  through various formats including blog writing contests, reel competitions, and quiz challenges.
                </p>
                <p>
                  We provide a space for traders and analysts to share insights, demonstrate knowledge, 
                  and compete for recognition and rewards based purely on merit and skill.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">Our Evaluation Programs</h2>
                <p className="mb-4">
                  All Test/Evaluation accounts provided by PropScholar are simulated and do not involve 
                  real financial transactions or live market exposure. Our evaluation process is entirely 
                  skill-based, and successful participants may be eligible for scholarship awards.
                </p>
                <p>
                  PropScholar does not act as or offer services as a broker, custodian, or financial advisor.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">Contact Us</h2>
                <p>
                  For any inquiries or support, please reach out to us at{' '}
                  <a 
                    href="mailto:support@propscholar.shop" 
                    className="text-white hover:text-white/80 underline underline-offset-4"
                  >
                    support@propscholar.shop
                  </a>
                </p>
              </section>
            </div>
          </div>

          {/* PropScholar CTA Section */}
          <div className="max-w-4xl mx-auto mt-24">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-10 md:p-14">
              {/* Subtle glow effect */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                  {/* Left Content */}
                  <div className="flex-1">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-white/35 mb-3">
                      Begin Your Trading Journey
                    </p>
                    <h3 className="text-2xl md:text-3xl font-light mb-3">
                      Your Skills, <span className="font-semibold">Our Platform</span>
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed max-w-md">
                      Join thousands of traders who trust PropScholar's scholarship model to turn their trading expertise into real opportunity.
                    </p>
                  </div>

                  {/* Right CTA */}
                  <div className="flex-shrink-0">
                    <a
                      href="https://propscholar.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="h-11 px-8 rounded-full bg-white/90 text-black hover:bg-white transition-all shadow-lg shadow-black/20 border-0 text-sm font-medium">
                        Start Trading
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap gap-3 mt-8 pt-8 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
                    <TrendingUp className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/50">Start from $5</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
                    <Users className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/50">3000+ Traders</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/50">4 Hr Payouts</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
                    <Zap className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/50">Scholarship Model</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
