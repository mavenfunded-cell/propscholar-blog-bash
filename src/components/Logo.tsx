import { PenTool } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg">
          <PenTool className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="absolute -inset-1 rounded-lg bg-gradient-to-br from-gold/20 to-gold-light/20 blur-sm -z-10" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-display font-bold text-foreground">PropScholar</span>
          <span className="text-xs text-muted-foreground font-body -mt-0.5">Blog Contest</span>
        </div>
      )}
    </div>
  );
}
