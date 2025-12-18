import { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';

interface RocketLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function RocketLoader({ onComplete, minDuration = 1500 }: RocketLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'launching' | 'complete'>('loading');

  useEffect(() => {
    const startTime = Date.now();
    const targetProgress = 100;
    const duration = minDuration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min((elapsed / duration) * 100, targetProgress);
      
      // Eased progress using cubic-bezier approximation
      const t = rawProgress / 100;
      const easedProgress = t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      setProgress(Math.round(easedProgress * 100));

      if (rawProgress < targetProgress) {
        requestAnimationFrame(animate);
      } else {
        setPhase('launching');
        setTimeout(() => {
          setPhase('complete');
          onComplete?.();
        }, 600);
      }
    };

    requestAnimationFrame(animate);
  }, [minDuration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
      {/* Ambient glow */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          transform: `scale(${0.8 + progress * 0.004})`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        {/* Rocket container */}
        <div 
          className={`relative transition-all duration-500 ease-out ${
            phase === 'launching' ? '-translate-y-32 opacity-0 scale-75' : ''
          }`}
        >
          {/* Rocket glow */}
          <div 
            className="absolute inset-0 blur-2xl transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle, rgba(255,200,100,${progress * 0.003}) 0%, transparent 70%)`,
              transform: 'scale(2)',
            }}
          />
          
          {/* Rocket icon */}
          <div className="relative">
            <Rocket 
              className={`w-16 h-16 text-white/90 transition-transform duration-300 ${
                phase === 'loading' ? 'animate-rocket-float' : ''
              }`}
              style={{
                filter: `drop-shadow(0 0 ${10 + progress * 0.2}px rgba(255,200,100,${0.2 + progress * 0.005}))`,
              }}
            />
            
            {/* Exhaust flames */}
            {progress > 30 && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5">
                <div 
                  className="w-1.5 rounded-full bg-gradient-to-b from-yellow-400 via-orange-500 to-transparent animate-flame"
                  style={{ height: `${8 + progress * 0.15}px`, animationDelay: '0ms' }}
                />
                <div 
                  className="w-2 rounded-full bg-gradient-to-b from-yellow-300 via-orange-400 to-transparent animate-flame"
                  style={{ height: `${12 + progress * 0.2}px`, animationDelay: '50ms' }}
                />
                <div 
                  className="w-1.5 rounded-full bg-gradient-to-b from-yellow-400 via-orange-500 to-transparent animate-flame"
                  style={{ height: `${8 + progress * 0.15}px`, animationDelay: '100ms' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div 
          className={`flex flex-col items-center gap-4 transition-all duration-500 ${
            phase === 'launching' ? 'opacity-0 translate-y-4' : ''
          }`}
        >
          {/* Progress bar */}
          <div className="relative w-48 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/60 to-white/90 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ transform: 'translateX(-100%)' }}
            />
          </div>

          {/* Progress text */}
          <div className="flex items-baseline gap-1">
            <span 
              className="text-3xl font-light text-white/90 tabular-nums tracking-tight transition-all duration-150"
              style={{ 
                textShadow: progress > 80 ? '0 0 20px rgba(255,255,255,0.3)' : 'none' 
              }}
            >
              {progress}
            </span>
            <span className="text-sm text-white/40">%</span>
          </div>

          {/* Status text */}
          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-medium">
            {progress < 30 && 'Initializing'}
            {progress >= 30 && progress < 60 && 'Loading'}
            {progress >= 60 && progress < 90 && 'Almost Ready'}
            {progress >= 90 && 'Launching'}
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes rocket-float {
          0%, 100% { transform: translateY(0) rotate(-45deg); }
          50% { transform: translateY(-4px) rotate(-45deg); }
        }
        @keyframes flame {
          0%, 100% { opacity: 0.9; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.15); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-rocket-float {
          animation: rocket-float 2s ease-in-out infinite;
        }
        .animate-flame {
          animation: flame 0.15s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
