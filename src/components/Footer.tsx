import { Link } from 'react-router-dom';
import { Instagram, Twitter, MessageSquare, Shield, Mail } from 'lucide-react';

export function Footer() {
  const socialLinks = [
    { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/propscholar/" },
    { icon: Twitter, label: "Twitter", href: "https://x.com/propscholar" },
    { icon: Shield, label: "Trustpilot", href: "https://www.trustpilot.com/review/propscholar.com" },
    { icon: MessageSquare, label: "Discord", href: "https://discord.gg/vqFUsBHzVT" },
  ];

  const companyLinks = [
    { label: "About Us", href: "/about" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "FAQ", href: "https://propscholar.com/blogs" },
  ];

  return (
    <footer className="relative border-t border-white/10 bg-[#0a0a0a] overflow-hidden">
      {/* Subtle gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="text-xs font-medium text-white/40 mb-4 uppercase tracking-widest">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  {item.href.startsWith('/') ? (
                    <Link 
                      to={item.href}
                      className="text-white/60 hover:text-white transition-colors text-sm"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a 
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors text-sm"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-medium text-white/40 mb-4 uppercase tracking-widest">Contact</h3>
            <div className="space-y-3">
              <p className="text-sm text-white/50">Email Support</p>
              <a 
                href="mailto:support@propscholar.shop"
                className="text-white/70 hover:text-white transition-colors text-sm inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                support@propscholar.shop
              </a>
            </div>
          </div>

          {/* Socials */}
          <div>
            <h3 className="text-xs font-medium text-white/40 mb-4 uppercase tracking-widest">Socials</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
                >
                  <social.icon className="w-4 h-4" />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white/90">PropScholar</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-white/40 mb-1">
              © {new Date().getFullYear()} PropScholar. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
