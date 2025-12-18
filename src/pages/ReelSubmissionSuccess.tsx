import { Link, useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Video, Gift, Coins } from 'lucide-react';

export default function ReelSubmissionSuccess() {
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
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

      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-lg mx-auto bg-[#111]/80 backdrop-blur-xl border-white/10 animate-scale-in">
            <CardContent className="p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold mb-3 text-white">Reel Submitted!</h1>
              
              <p className="text-white/60 mb-4">
                Your reel has been uploaded successfully. Our team will review your submission and winners will be announced soon.
              </p>

              {/* Coins Earned Info */}
              <div className="mb-6 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center justify-center gap-2 text-yellow-500">
                  <Coins className="w-5 h-5" />
                  <span className="font-medium">You earned Space Coins for participating!</span>
                </div>
              </div>

              <div className="space-y-3">
                <Link to="/rewards" className="block">
                  <Button className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-semibold">
                    <Gift className="w-4 h-4" />
                    Go to Rewards
                  </Button>
                </Link>
                
                <Link to="/reels" className="block">
                  <Button variant="outline" className="w-full gap-2 border-white/20 text-white hover:bg-white/5">
                    <Video className="w-4 h-4" />
                    View More Reel Contests
                  </Button>
                </Link>
                
                <Link to="/" className="block">
                  <Button variant="ghost" className="w-full gap-2 text-white/50 hover:text-white hover:bg-white/5">
                    Back to PropScholar Space
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </div>
  );
}
