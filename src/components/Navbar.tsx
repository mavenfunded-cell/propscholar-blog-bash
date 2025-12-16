import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { name: 'Blog', href: '/', external: false },
  { name: 'About', href: 'https://propscholar.com/about', external: true },
  { name: 'Terms', href: '/terms', external: false },
  { name: 'Shop', href: 'https://propscholar.com/shop', external: true },
  { name: 'Home', href: 'https://propscholar.com', external: true },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="border-b border-border/30 backdrop-blur-md bg-background/90 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765786687/Untitled_design_2_pbmc6o.png" 
              alt="PropScholar Logo" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-foreground">PropScholar</span>
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
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
                >
                  {link.name}
                </Link>
              )
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden py-4 border-t border-border/30">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                )
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
