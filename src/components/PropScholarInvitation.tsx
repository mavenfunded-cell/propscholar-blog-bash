import { ExternalLink, Sparkles } from 'lucide-react';

interface PropScholarInvitationProps {
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export function PropScholarInvitation({ variant = 'default', className = '' }: PropScholarInvitationProps) {
  if (variant === 'inline') {
    return (
      <a
        href="https://propscholar.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300 ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-white/50 group-hover:text-white/70 transition-colors" />
        <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
          Start trading with <span className="font-medium text-white/80">$5</span>
        </span>
        <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <a
        href="https://propscholar.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`group block ${className}`}
      >
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-white/[0.03] via-white/[0.05] to-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500 p-5">
          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-4 h-4 text-white/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  Join Leading Traders
                </p>
                <p className="text-xs text-white/45">
                  Start your funded journey from <span className="text-white/70 font-medium">$5</span>
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>
        </div>
      </a>
    );
  }

  // Default variant - premium invitation card
  return (
    <a
      href="https://propscholar.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`group block ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/[0.08] hover:border-white/[0.15] transition-all duration-500">
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/[0.03] rounded-full blur-3xl group-hover:bg-white/[0.05] transition-colors duration-500" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/[0.02] rounded-full blur-2xl" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">Exclusive Invitation</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>
          
          {/* Content */}
          <div className="space-y-4">
            <h3 className="text-xl md:text-2xl font-light text-white/90 group-hover:text-white transition-colors leading-tight">
              Join the Leading Traders
              <br />
              <span className="font-semibold">Scholarship Program</span>
            </h3>
            
            <p className="text-sm text-white/50 leading-relaxed max-w-md">
              Take the first step towards becoming a funded trader. Start your evaluation journey with just $5 and unlock access to real capital.
            </p>
            
            {/* CTA hint */}
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-white/70 group-hover:bg-white/[0.1] group-hover:text-white/90 transition-all duration-300">
                Start from $5
              </span>
              <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                propscholar.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
