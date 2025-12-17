import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';

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
        </main>

        <Footer />
      </div>
    </div>
  );
}
