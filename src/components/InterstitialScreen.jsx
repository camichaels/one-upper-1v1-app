import { useState, useEffect } from 'react';
import Header from './Header';
import RipleyIcon from '../assets/ripley.svg';

export default function InterstitialScreen({ emceeText, onComplete, duration = 4000 }) {
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Auto-advance after duration
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / (duration / 100))));
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
      clearInterval(progressInterval);
    };
  }, [duration, onComplete]);

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

          {/* Progress Bar */}
          <div className="w-full">
            <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all ease-linear"
                style={{ width: `${progress}%`, transitionDuration: '100ms' }}
              ></div>
            </div>
          </div>

        </div>
      </div>

      {/* Skip Button - Bottom */}
      <div className="max-w-md mx-auto w-full">
        <button
          onClick={onComplete}
          className="w-full py-3 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          Skip ({countdown}s)
        </button>
      </div>
    </div>
  );
}