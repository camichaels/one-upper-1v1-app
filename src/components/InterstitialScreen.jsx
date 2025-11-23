import { useState, useEffect } from 'react';
import Header from './Header';
import RipleyIcon from '../assets/ripley.svg';

export default function InterstitialScreen({ emceeText, onComplete, duration = 10000 }) {
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));
  const [autoAdvance, setAutoAdvance] = useState(true);

  useEffect(() => {
    if (!autoAdvance) return;

    // Auto-advance countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoAdvance, onComplete]);

  return (
    <div className="min-h-screen bg-amber-950/10 px-5 py-6 flex flex-col">
      <Header />
      
      {/* Main Content - Vertically Centered */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="max-w-md w-full text-center space-y-6">
          
          {/* Ripley Icon - Compact */}
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/30 blur-3xl rounded-full"></div>
            <div className="relative">
              <img 
                src={RipleyIcon} 
                alt="Ripley" 
                className="w-20 h-20 mx-auto drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Ripley Label - Close to icon */}
          <div className="text-xs font-bold text-amber-400 tracking-wider uppercase -mt-2">
            Host Ripley says...
          </div>

          {/* Emcee Text - No box, just text */}
          <div className="px-4 py-2">
            <p className="text-xl text-slate-100 leading-relaxed font-medium">
              {emceeText}
            </p>
          </div>

        </div>
      </div>

      {/* Buttons - Bottom (visible without scrolling) */}
      <div className="max-w-md mx-auto w-full space-y-2 pb-4">
        {autoAdvance ? (
          <>
            {/* Countdown button with embedded timer */}
            <button
              onClick={() => {
                setAutoAdvance(false);
                setCountdown(null);
                onComplete();
              }}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
            >
              {countdown !== null ? `Continue in ${countdown}s • Skip` : 'CONTINUE'}
            </button>
            
            {/* Stay Here button */}
            <button
              onClick={() => {
                setAutoAdvance(false);
                setCountdown(null);
              }}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 transition-all font-semibold"
            >
              STAY HERE
            </button>
          </>
        ) : (
          <button
            onClick={onComplete}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
          >
            CONTINUE
          </button>
        )}
      </div>
    </div>
  );
}