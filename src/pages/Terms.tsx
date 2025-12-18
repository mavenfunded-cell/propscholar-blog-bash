import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';

export default function Terms() {
  useSEO();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          Terms and Conditions
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Welcome to PropScholar Space ("Platform", "we", "us", "our"), accessible at propscholar.space.
          PropScholar Space is part of the PropScholar ecosystem and is designed for learning, community engagement, events, competitions, and reward-based participation.
        </p>
        <p className="text-white/50 text-sm mb-12">
          By accessing or using this Platform, you agree to be bound by the following Terms and Conditions. If you do not agree, please discontinue use immediately.
        </p>
        
        <div className="prose prose-invert max-w-none space-y-10 text-white/70">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Platform Purpose</h2>
            <p className="mb-4">PropScholar Space exists to provide:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Educational content related to trading and market understanding</li>
              <li>Community events and competitions</li>
              <li>Blog competitions and learning initiatives</li>
              <li>Reward and coin based engagement systems</li>
              <li>Announcements and ecosystem updates</li>
            </ul>
            <p className="mt-4">
              PropScholar Space does not provide trading accounts, evaluations, or financial services. All challenge purchases and funded account services are provided separately on propscholar.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Eligibility</h2>
            <p className="mb-4">By using PropScholar Space, you confirm that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are at least 18 years old</li>
              <li>You are legally allowed to access online platforms in your jurisdiction</li>
              <li>You provide accurate and truthful information during registration</li>
            </ul>
            <p className="mt-4">We reserve the right to suspend or terminate access if eligibility requirements are violated.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="mb-4">To access certain features, users may be required to create an account.</p>
            <p className="mb-4">You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain confidentiality of your login credentials</li>
              <li>Be responsible for all activities under your account</li>
              <li>Notify us immediately of unauthorized access</li>
            </ul>
            <p className="mt-4">PropScholar Space is not responsible for losses caused by user negligence.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Content Policy</h2>
            
            <h3 className="text-lg font-medium text-white/90 mt-6 mb-3">4.1 Platform Content</h3>
            <p>All educational materials, announcements, visuals, designs, animations, and system logic published on PropScholar Space are owned by PropScholar unless stated otherwise.</p>
            
            <h3 className="text-lg font-medium text-white/90 mt-6 mb-3">4.2 User Submitted Content</h3>
            <p className="mb-4">Some sections may allow user participation such as blog competitions or comments.</p>
            <p className="mb-4">By submitting content, you confirm that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The content is original and does not violate third-party rights</li>
              <li>It does not contain false, misleading, abusive, or unlawful material</li>
              <li>PropScholar may display, edit, or remove content at its discretion</li>
            </ul>
            <p className="mt-4">We reserve the right to remove any content without prior notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Admin-Only Uploads and Features</h2>
            <p className="mb-4">Certain features, including but not limited to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Video uploads</li>
              <li>Featured content</li>
              <li>Event listings</li>
              <li>Reward systems</li>
            </ul>
            <p className="mt-4">are strictly managed by PropScholar administrators. Users are not permitted to upload or manipulate restricted content unless explicitly authorized.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Rewards, Coins, and Events</h2>
            <p className="mb-4">PropScholar Space may include reward systems, coins, or event-based incentives.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Rewards have no cash value unless explicitly stated</li>
              <li>Rewards are non transferable and non exchangeable</li>
              <li>PropScholar reserves the right to modify or discontinue reward systems at any time</li>
              <li>Abuse, manipulation, or exploitation of rewards will result in account suspension</li>
            </ul>
            <p className="mt-4">All event rules will be communicated separately and must be followed strictly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. No Financial Advice</h2>
            <p className="mb-4">All content provided on PropScholar Space is for educational and informational purposes only.</p>
            <p className="mb-4">We do not provide:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Investment advice</li>
              <li>Trading signals</li>
              <li>Financial recommendations</li>
            </ul>
            <p className="mt-4">Users are solely responsible for their trading decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Relationship With PropScholar.com</h2>
            <p className="mb-4">PropScholar Space operates independently from propscholar.com, which handles:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Challenge purchases</li>
              <li>Evaluations</li>
              <li>Funded trading services</li>
            </ul>
            <p className="mt-4">Actions taken on PropScholar Space do not guarantee acceptance, success, or benefits on propscholar.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Prohibited Activities</h2>
            <p className="mb-4">Users must not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempt to exploit platform vulnerabilities</li>
              <li>Engage in spam, abuse, or manipulation</li>
              <li>Impersonate others</li>
              <li>Upload malicious or misleading content</li>
              <li>Attempt unauthorized access to admin systems</li>
            </ul>
            <p className="mt-4">Violation of these rules may result in immediate suspension or permanent removal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Intellectual Property</h2>
            <p>All trademarks, logos, designs, and written content on PropScholar Space are the intellectual property of PropScholar.</p>
            <p className="mt-4">Unauthorized use, reproduction, or distribution is strictly prohibited.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Suspension and Termination</h2>
            <p className="mb-4">We reserve the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Suspend or terminate accounts without prior notice</li>
              <li>Remove access to features or rewards</li>
              <li>Restrict platform usage if Terms are violated</li>
            </ul>
            <p className="mt-4">Such actions are final and non reversible.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Limitation of Liability</h2>
            <p className="mb-4">PropScholar Space is provided on an "as is" basis.</p>
            <p className="mb-4">We are not liable for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Technical issues or downtime</li>
              <li>Loss of data</li>
              <li>Indirect or consequential damages</li>
              <li>User decisions made based on platform content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Platform indicates acceptance of updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Governing Law</h2>
            <p>These Terms are governed by applicable laws in the jurisdiction under which PropScholar operates.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">15. Contact Information</h2>
            <p>For questions regarding these Terms, please contact:</p>
            <div className="mt-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-white/80 font-medium">Support Team</p>
              <p className="text-white/60">PropScholar</p>
              <p className="text-white/50 text-sm mt-2">Official communication channels listed on the Platform</p>
            </div>
          </section>

          <p className="text-sm text-white/40 mt-12 pt-8 border-t border-white/10">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
