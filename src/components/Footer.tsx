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
    { label: "About Us", href: "https://propscholar.com/about" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "https://propscholar.com/privacy-policy" },
    { label: "FAQ", href: "https://propscholar.com/blogs" },
  ];

  return (
    <footer className="relative border-t border-border/30 bg-background overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)/0.1) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)/0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  {item.href.startsWith('/') ? (
                    <Link 
                      to={item.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a 
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
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
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Contact</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Email Support</p>
              <a 
                href="mailto:support@propscholar.shop"
                className="text-primary hover:text-primary/80 transition-colors text-sm inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                support@propscholar.shop
              </a>
            </div>
          </div>

          {/* Socials */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Socials</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  <social.icon className="w-4 h-4" />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">PropScholar</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground mb-1">
              © {new Date().getFullYear()} PropScholar. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <a href="https://propscholar.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacy</a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-border/30">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Disclaimer</h4>
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            PropScholar is a government-registered business under the MSME (Udyam) initiative. All Test/Evaluation accounts provided by PropScholar are simulated and do not involve real financial transactions or live market exposure. We are strictly an educational platform, and our programs are designed to assess trading skills in a simulated environment. Our evaluation process is entirely skill-based, and successful participants may be eligible for a scholarship award. PropScholar does not act as or offer services as a broker, custodian, or financial advisor. Participation in our programs is voluntary, and program fees are not to be considered deposits or investments of any kind.
          </p>
        </div>
      </div>
    </footer>
  );
}
