import { useState, useEffect } from 'react';
import Header from './Header';

export default function InterstitialScreen({ emceeText, onComplete, nextRound }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col px-5 py-8">
      <Header />
      
      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Ripley label - consistent with verdict flow */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🎙️</span>
          <span className="text-lg font-bold text-orange-500">Ripley</span>
        </div>
      
        {/* Emcee text */}
        <p className="text-xl text-slate-100 text-center max-w-md leading-relaxed mb-12">
          {emceeText}
        </p>
      
        {/* Continue button with round number */}
        <button
          onClick={onComplete}
          className="w-full max-w-sm px-6 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold text-lg"
        >
          {nextRound ? `On to Round ${nextRound}` : 'Continue'}
        </button>
      </div>
    </div>
  );
}