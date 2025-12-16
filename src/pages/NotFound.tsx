import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-destructive/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-destructive/10 rounded-full blur-3xl" />

        <div className="text-center relative animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Oops! The page you're looking for doesn't exist.
          </p>
          
          <Link to="/">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Home className="w-4 h-4" />
              Return to Home
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/30 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PropScholar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
