import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';

export default function PrivacyPolicy() {
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
                Privacy <span className="font-semibold">Policy</span>
              </h1>
              <p className="text-white/60 text-base leading-relaxed">
                Last updated: December 2024
              </p>
            </div>

            {/* Content */}
            <div className="space-y-10 text-white/70 leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">1. Introduction</h2>
                <p>
                  PropScholar ("we," "our," or "us") is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                  information when you use our platform and services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">2. Information We Collect</h2>
                <p className="mb-3">We may collect the following types of information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Personal information (name, email address, phone number)</li>
                  <li>Account information and login credentials</li>
                  <li>Competition submissions and related content</li>
                  <li>Usage data and analytics</li>
                  <li>Device and browser information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">3. How We Use Your Information</h2>
                <p className="mb-3">We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain our services</li>
                  <li>Process competition entries and rewards</li>
                  <li>Communicate with you about updates and promotions</li>
                  <li>Improve our platform and user experience</li>
                  <li>Ensure security and prevent fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">4. Information Sharing</h2>
                <p>
                  We do not sell your personal information. We may share information with trusted 
                  third-party service providers who assist us in operating our platform, conducting 
                  our business, or servicing you, as long as those parties agree to keep this 
                  information confidential.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">5. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational security measures to protect 
                  your personal information against unauthorized access, alteration, disclosure, or 
                  destruction. However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">6. Cookies and Tracking</h2>
                <p>
                  We use cookies and similar tracking technologies to enhance your experience on our 
                  platform. You can control cookie preferences through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">7. Your Rights</h2>
                <p className="mb-3">You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Withdraw consent where applicable</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">8. Children's Privacy</h2>
                <p>
                  Our services are not intended for individuals under 18 years of age. We do not 
                  knowingly collect personal information from children.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">9. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  changes by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white/90 mb-4">10. Contact Us</h2>
                <p>
                  If you have questions about this Privacy Policy, please contact us at{' '}
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
