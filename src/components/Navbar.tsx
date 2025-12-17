import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { name: 'Space', href: '/', external: false },
  { name: 'About', href: 'https://propscholar.com/about', external: true },
  { name: 'Terms', href: '/terms', external: false },
  { name: 'Shop', href: 'https://propscholar.com/shop', external: true },
  { name: 'Home', href: 'https://propscholar.com', external: true },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b border-white/10 backdrop-blur-xl bg-[#0a0a0a]/80 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765786687/Untitled_design_2_pbmc6o.png" 
              alt="PropScholar Logo" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-white/90">PropScholar</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="px-4 py-2 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5"
                >
                  {link.name}
                </Link>
              )
            ))}
            
            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                <div className="flex items-center gap-1.5 text-white/50">
                  <User className="w-4 h-4" />
                  <span className="text-sm hidden lg:block truncate max-w-[120px]">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-white/50 hover:text-white hover:bg-white/5"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button 
                  size="sm" 
                  className="ml-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-md"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  Login
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white/70 hover:text-white hover:bg-white/5"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                )
              ))}
              
              {/* Mobile Auth Button */}
              {user ? (
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  <LogOut className="w-4 h-4 ml-auto" />
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-3 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/5 flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn className="w-4 h-4" />
                  Login / Sign Up
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
