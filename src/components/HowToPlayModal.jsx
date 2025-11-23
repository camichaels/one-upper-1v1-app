import { useState } from 'react';

export default function HowToPlayModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border-2 border-orange-500 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-orange-500">How to Play</h2>
        </div>

        {/* The Basics */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-3">The Basics</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>One Rivalry at a Time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Every Round is a "Show"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Submit Your Best Answer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>AI Judges Score You (1-10)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Highest Total Gets the Mic (Until Next Show)</span>
            </li>
          </ul>
        </div>

        {/* Pro Tips */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-3">Pro Tips</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Be funny, creative, or outrageous (it's a head-on duel with your buddy)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Check out the judges' personalities before answering (find ways to appeal to them)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>The mic shows who won each show</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Check out judge banter and past show scores</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Create multiple profiles with your phone number to juggle different rivalries</span>
            </li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
        >
          Got It!
        </button>
      </div>
    </div>
  );
}