import { Link, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Home, User } from 'lucide-react';

export default function SubmissionSuccess() {
  const location = useLocation();
  const submitterName = location.state?.name || 'Participant';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative">
      {/* Background */}
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

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* Success Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full animate-scale-in border-white/10 bg-[#111]/80 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              {/* User Avatar */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-10 h-10 text-white/60" />
              </div>
              
              {/* User Name */}
              <p className="text-lg font-medium text-white mb-4">{submitterName}</p>
              
              {/* Success Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2 text-white">
                Submission Successful!
              </h1>
              
              <p className="text-white/60 mb-6">
                Your blog entry has been submitted successfully. Our team will review your submission and winners will be announced soon.
              </p>

              <Link to="/">
                <Button variant="outline" className="w-full gap-2 border-white/20 text-white hover:bg-white/5">
                  <Home className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </div>
  );
}
