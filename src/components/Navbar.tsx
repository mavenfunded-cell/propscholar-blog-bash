import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, User, Coins, Home, Calendar, Gift, Plus, Info, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';

const navLinks = [
  { name: 'Home', href: '/', external: false, icon: Home, scrollTo: null },
  { name: 'Events', href: '/', external: false, icon: Calendar, scrollTo: 'choose-your-arena' },
  { name: 'Rewards', href: '/rewards', external: false, icon: Gift, scrollTo: null },
  { name: 'About', href: '/about', external: false, icon: Info, scrollTo: null },
  { name: 'Shop', href: 'https://propscholar.com/shop', external: true, icon: null, scrollTo: null },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch coin balance when user is logged in
  useEffect(() => {
    if (user) {
      fetchCoinBalance();
    } else {
      setCoinBalance(null);
    }
  }, [user]);

  const fetchCoinBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setCoinBalance(data.balance);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-[#080808]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'bg-transparent backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765962713/Untitled_design_3_nkt1ky.png" 
              alt="PropScholar Logo" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-white/90">PropScholar</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = !link.external && !link.scrollTo && (
                link.href === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(link.href)
              );
              
              const handleClick = (e: React.MouseEvent) => {
                if (link.scrollTo) {
                  e.preventDefault();
                  if (location.pathname !== '/') {
                    navigate('/');
                    setTimeout(() => {
                      document.getElementById(link.scrollTo!)?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  } else {
                    document.getElementById(link.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              };
              
              return link.external ? (
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
                  onClick={handleClick}
                  className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                    isActive 
                      ? 'text-white bg-white/10' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                {/* Coin Balance Indicator */}
                <Link 
                  to="/rewards"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors group"
                >
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-500">
                    {coinBalance !== null ? coinBalance : '—'}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-yellow-500 group-hover:scale-110 transition-transform" />
                </Link>
                
                {/* Notification Bell */}
                <NotificationBell />
                
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm hidden lg:block truncate max-w-[120px]">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                </Link>
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
              {navLinks.map((link) => {
                const isActive = !link.external && !link.scrollTo && (
                  link.href === '/' 
                    ? location.pathname === '/' 
                    : location.pathname.startsWith(link.href)
                );
                const IconComponent = link.icon;
                
                const handleMobileClick = (e: React.MouseEvent) => {
                  setIsOpen(false);
                  if (link.scrollTo) {
                    e.preventDefault();
                    if (location.pathname !== '/') {
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById(link.scrollTo!)?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else {
                      document.getElementById(link.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                };
                
                return link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5 flex items-center gap-2"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={handleMobileClick}
                    className={`px-4 py-3 text-sm font-medium transition-colors rounded-md flex items-center gap-2 ${
                      isActive 
                        ? 'text-white bg-white/10' 
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-4 h-4" />}
                    {link.name}
                  </Link>
                );
              })}
              
              {/* Mobile Auth Button */}
              {user ? (
                <div className="flex flex-col gap-1">
                  {/* Mobile Coin Balance */}
                  <Link
                    to="/rewards"
                    className="px-4 py-3 text-sm font-medium transition-colors rounded-md flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-500 font-semibold">{coinBalance !== null ? coinBalance : '—'} Coins</span>
                    <Plus className="w-4 h-4 text-yellow-500 ml-auto" />
                  </Link>
                  {/* Mobile Notifications */}
                  <div className="px-4 py-2">
                    <NotificationBell />
                  </div>
                  <Link
                    to="/dashboard"
                    className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5 flex items-center gap-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="px-4 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-md hover:bg-white/5 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
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
