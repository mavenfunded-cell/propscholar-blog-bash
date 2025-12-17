import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080808' }}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-white">
          Terms and Conditions
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and participating in the PropScholar Blog Writing Contest, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not participate in the contest.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Eligibility</h2>
            <p>
              The contest is open to all individuals who are at least 18 years of age. Employees, contractors, and affiliates of PropScholar and their immediate family members are not eligible to participate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Submission Guidelines</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All submissions must be original work created by the participant.</li>
              <li>Submissions must meet the minimum word count specified for each contest.</li>
              <li>Content must be appropriate and not contain any offensive, defamatory, or illegal material.</li>
              <li>Plagiarism is strictly prohibited and will result in immediate disqualification.</li>
              <li>Submissions must be in English unless otherwise specified.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Intellectual Property</h2>
            <p>
              By submitting your blog post, you grant PropScholar a non-exclusive, royalty-free license to use, reproduce, modify, and display your submission for promotional and educational purposes. You retain ownership of your original content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Judging Criteria</h2>
            <p>
              Submissions will be evaluated based on the following criteria:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Originality and creativity</li>
              <li>Quality of writing and clarity</li>
              <li>Relevance to the topic</li>
              <li>Accuracy of information</li>
              <li>Overall engagement and readability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Privacy</h2>
            <p>
              We collect personal information (name, email, phone number) solely for the purpose of administering the contest. Your information will not be sold or shared with third parties except as required by law or for contest administration purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Disqualification</h2>
            <p>
              PropScholar reserves the right to disqualify any participant who violates these terms, submits plagiarized content, or engages in any form of fraud or manipulation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
            <p>
              PropScholar shall not be liable for any direct, indirect, incidental, or consequential damages arising from participation in the contest or any technical issues that may prevent submission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Modifications</h2>
            <p>
              PropScholar reserves the right to modify these terms and conditions at any time. Participants will be notified of any significant changes via email or website announcement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Contact</h2>
            <p>
              For any questions regarding these terms or the contest, please contact us through our official website at{' '}
              <a href="https://propscholar.com" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                propscholar.com
              </a>.
            </p>
          </section>

          <p className="text-sm text-white/50 mt-12 pt-8 border-t border-white/10">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} PropScholar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
