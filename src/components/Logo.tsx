interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="https://res.cloudinary.com/dzozyqlqr/image/upload/v1765962713/Untitled_design_3_nkt1ky.png" 
        alt="PropScholar Logo" 
        className="h-10 w-auto"
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-display font-bold text-foreground">PropScholar</span>
          <span className="text-xs text-muted-foreground font-body -mt-0.5">Blog Contest</span>
        </div>
      )}
    </div>
  );
}
