import { Link, useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Video } from 'lucide-react';

export default function ReelSubmissionSuccess() {
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Full page gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-background to-[#0c1222]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-lg mx-auto bg-card/80 backdrop-blur-sm border-purple-500/30 animate-scale-in">
            <CardContent className="p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-purple-400" />
              </div>
              
              <h1 className="text-2xl font-bold mb-3 text-foreground">Reel Submitted!</h1>
              
              <p className="text-muted-foreground mb-8">
                Your reel has been uploaded successfully. Our team will review your submission and winners will be announced soon.
              </p>

              <div className="space-y-3">
                <Link to="/reels" className="block">
                  <Button className="w-full gap-2 bg-purple-500 hover:bg-purple-600">
                    <Video className="w-4 h-4" />
                    View More Reel Contests
                  </Button>
                </Link>
                
                <Link to="/" className="block">
                  <Button variant="outline" className="w-full gap-2">
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
