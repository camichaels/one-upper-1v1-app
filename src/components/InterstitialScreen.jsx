import { useState, useEffect } from 'react';

export default function InterstitialScreen({ emceeText, onComplete }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      {/* One-Upper logo */}
      <img src="/logo-wide.png" alt="One-Upper" className="h-16 mb-6" />
      
      {/* Ripley label - consistent with verdict flow */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🎙️</span>
        <span className="text-lg font-bold text-orange-500">Ripley</span>
      </div>
      
      {/* Emcee text */}
      <p className="text-xl text-slate-100 text-center max-w-md leading-relaxed mb-12">
        {emceeText}
      </p>
      
      {/* Single continue button - no countdown */}
      <button
        onClick={onComplete}
        className="w-full max-w-sm px-6 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold text-lg"
      >
        Continue
      </button>
    </div>
  );
}