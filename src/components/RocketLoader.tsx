import { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';

interface RocketLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function RocketLoader({ onComplete, minDuration = 2000 }: RocketLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'launching' | 'complete'>('loading');

  useEffect(() => {
    const startTime = Date.now();
    const duration = minDuration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const linearProgress = Math.min((elapsed / duration) * 100, 100);
      
      // Smooth ease-out progress
      const t = linearProgress / 100;
      const easedProgress = 1 - Math.pow(1 - t, 3);
      
      setProgress(Math.round(easedProgress * 100));

      if (linearProgress < 100) {
        requestAnimationFrame(animate);
      } else {
        setPhase('launching');
        setTimeout(() => {
          setPhase('complete');
          onComplete?.();
        }, 800);
      }
    };

    requestAnimationFrame(animate);
  }, [minDuration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
      {/* Ambient glow */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          transform: `scale(${0.8 + progress * 0.003})`,
          transition: 'transform 0.5s ease-out',
        }}
      />

      <div className="relative flex flex-col items-center gap-10">
        {/* Rocket container */}
        <div 
          className="relative transition-all duration-[800ms] ease-out"
          style={{
            transform: phase === 'loading' 
              ? 'translateY(0) scale(1)' 
              : 'translateY(-120px) scale(0.8)',
            opacity: phase === 'loading' ? 1 : 0,
          }}
        >
          {/* Rocket glow */}
          <div 
            className="absolute inset-0 blur-3xl transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle, rgba(255,180,80,${progress * 0.004}) 0%, transparent 60%)`,
              transform: 'scale(3)',
            }}
          />
          
          {/* Rocket icon */}
          <div className="relative">
            <Rocket 
              className="w-14 h-14 text-white/85"
              style={{
                transform: 'rotate(-45deg)',
                filter: `drop-shadow(0 0 ${8 + progress * 0.15}px rgba(255,200,100,${0.15 + progress * 0.004}))`,
                transition: 'filter 0.3s ease-out',
              }}
            />
            
            {/* Exhaust flames - only show after 20% */}
            {progress > 20 && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5">
                <div 
                  className="w-1 rounded-full bg-gradient-to-b from-amber-300/80 via-orange-500/60 to-transparent"
                  style={{ 
                    height: `${6 + progress * 0.12}px`,
                    opacity: 0.7 + (progress * 0.003),
                    animation: 'flame 0.12s ease-in-out infinite',
                    animationDelay: '0ms'
                  }}
                />
                <div 
                  className="w-1.5 rounded-full bg-gradient-to-b from-yellow-200/90 via-orange-400/70 to-transparent"
                  style={{ 
                    height: `${10 + progress * 0.18}px`,
                    opacity: 0.8 + (progress * 0.002),
                    animation: 'flame 0.12s ease-in-out infinite',
                    animationDelay: '40ms'
                  }}
                />
                <div 
                  className="w-1 rounded-full bg-gradient-to-b from-amber-300/80 via-orange-500/60 to-transparent"
                  style={{ 
                    height: `${6 + progress * 0.12}px`,
                    opacity: 0.7 + (progress * 0.003),
                    animation: 'flame 0.12s ease-in-out infinite',
                    animationDelay: '80ms'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div 
          className="flex flex-col items-center gap-5 transition-all duration-500"
          style={{
            opacity: phase === 'loading' ? 1 : 0,
            transform: phase === 'loading' ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {/* Progress bar */}
          <div className="relative w-52 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 via-white/70 to-white/80 rounded-full"
              style={{ 
                width: `${progress}%`,
                transition: 'width 0.15s ease-out',
              }}
            />
          </div>

          {/* Progress text */}
          <div className="flex items-baseline gap-1">
            <span 
              className="text-4xl font-extralight text-white/85 tabular-nums tracking-tight"
              style={{ 
                textShadow: progress > 80 ? '0 0 30px rgba(255,255,255,0.2)' : 'none',
                transition: 'text-shadow 0.3s ease-out',
              }}
            >
              {progress}
            </span>
            <span className="text-sm text-white/30 font-light">%</span>
          </div>

          {/* Status text */}
          <p className="text-[10px] tracking-[0.25em] uppercase text-white/25 font-medium">
            {progress < 25 && 'Initializing'}
            {progress >= 25 && progress < 50 && 'Loading'}
            {progress >= 50 && progress < 80 && 'Almost Ready'}
            {progress >= 80 && 'Launching'}
          </p>
        </div>
      </div>

      {/* CSS for flame animation */}
      <style>{`
        @keyframes flame {
          0%, 100% { opacity: 0.85; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.1); }
        }
      `}</style>
    </div>
  );
}
