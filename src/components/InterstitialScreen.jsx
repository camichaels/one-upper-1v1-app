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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-8 flex flex-col">
      <Header />
      
      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-8">
          
          {/* Ripley Icon with Spotlight Effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
            <div className="relative">
              <img 
                src={RipleyIcon} 
                alt="Ripley" 
                className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Ripley Label */}
          <div className="text-sm font-bold text-orange-500 tracking-wider uppercase">
            Ripley • Producer
          </div>

          {/* Emcee Text */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <p className="text-lg text-slate-100 leading-relaxed font-medium">
              {emceeText}
            </p>
          </div>

        </div>
      </div>

      {/* Buttons - Bottom (matching Screen4 verdict button treatment) */}
      <div className="max-w-md mx-auto w-full space-y-2">
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