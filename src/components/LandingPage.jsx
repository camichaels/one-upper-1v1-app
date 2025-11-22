import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();

  // Auto-redirect returning users who already have a profile
  useEffect(() => {
    const activeProfileId = localStorage.getItem('activeProfileId');
    if (activeProfileId) {
      navigate('/play');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        
        {/* HERO SECTION */}
        <div className="text-center mb-8">
          {/* Logo - Text based for now */}
          <img src="/logo.png" alt="One-Upper" className="w-64 mx-auto mb-6" />
          <p className="text-xl text-slate-200 font-medium mb-4">Part brain boost, all buddy boast.</p>
          
          {/* Hero Subhead */}
          <p className="text-lg text-slate-200 mb-6">
            Answer the same prompt. AI judges crown a winner. Repeat. See who really knows how to up-wit, up-smart, and up-impress.
          </p>
          
          {/* Primary CTA */}
          <Link 
            to="/play"
            className="block w-full px-6 py-4 bg-orange-500 text-white text-lg font-bold rounded-lg hover:bg-orange-400 transition-all text-center"
          >
            Play Now
          </Link>
        </div>

        {/* HOW IT WORKS */}
        <div className="border-t-2 border-slate-600 pt-8 mb-12">
          <h2 className="text-2xl font-bold text-orange-500 text-center mb-6">HOW IT WORKS</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 border border-slate-600 rounded-full flex items-center justify-center text-orange-500 font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="font-bold text-slate-100 mb-1">Challenge a Friend</h3>
                <p className="text-slate-300 text-sm">Start a rivalry for the ages</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 border border-slate-600 rounded-full flex items-center justify-center text-orange-500 font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="font-bold text-slate-100 mb-1">Get Judged</h3>
                <p className="text-slate-300 text-sm">Get ridiculous prompts. Write impressive answers.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 border border-slate-600 rounded-full flex items-center justify-center text-orange-500 font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="font-bold text-slate-100 mb-1">Keep Going</h3>
                <p className="text-slate-300 text-sm">The rivalry never ends. Can you keep winning?</p>
              </div>
            </div>
          </div>
        </div>

        {/* THE JUDGES */}
        <div className="border-t-2 border-slate-600 pt-8 mb-12">
          <h2 className="text-2xl font-bold text-orange-500 text-center mb-6">THE JUDGES</h2>
          <p className="text-lg text-slate-200 text-center mb-6">
            They're brutally honest. Hilariously biased. And never boring. We've got 50+ AI judge personalities. Each round randomly picks 3 to decide your fate.
          </p>

          {/* Judge Cards */}
          <div className="space-y-4">
            {/* Judge 1: Savage Sarah */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">😈</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-100 mb-2">Savage Sarah</div>
                  <div className="text-xs text-slate-400 font-bold mb-1">SCORING STYLE:</div>
                  <div className="text-sm text-slate-300 mb-2">No mercy for boring answers</div>
                  <div className="text-xs text-slate-400 font-bold mb-1">SAMPLE ROAST:</div>
                  <div className="text-sm text-slate-200 italic">"I've seen better burns from a nightlight."</div>
                </div>
              </div>
            </div>

            {/* Judge 2: Coach Kevin */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💪</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-100 mb-2">Coach Kevin</div>
                  <div className="text-xs text-slate-400 font-bold mb-1">SCORING STYLE:</div>
                  <div className="text-sm text-slate-300 mb-2">Loves effort and heart</div>
                  <div className="text-xs text-slate-400 font-bold mb-1">SAMPLE HYPE:</div>
                  <div className="text-sm text-slate-200 italic">"That's what I'm talking about! INTENSITY!"</div>
                </div>
              </div>
            </div>

            {/* Judge 3: Snoot Wellington III */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎩</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-100 mb-2">Snoot Wellington III</div>
                  <div className="text-xs text-slate-400 font-bold mb-1">SCORING STYLE:</div>
                  <div className="text-sm text-slate-300 mb-2">Only sophistication will do</div>
                  <div className="text-xs text-slate-400 font-bold mb-1">SAMPLE SNEER:</div>
                  <div className="text-sm text-slate-200 italic">"How pedestrian. Were you raised by wolves?"</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WHAT YOU'RE PLAYING FOR */}
        <div className="border-t-2 border-slate-600 pt-8 mb-12">
          <h2 className="text-2xl font-bold text-orange-500 text-center mb-6">WHAT YOU'RE PLAYING FOR</h2>
          
          {/* Golden Mic Callout */}
          <div className="bg-slate-700/50 border-2 border-orange-500/50 rounded-lg p-8 text-center">
            <div className="text-7xl mb-4" style={{ filter: 'sepia(100%) saturate(500%) hue-rotate(25deg) brightness(1.3)' }}>
              🎤
            </div>
            <h3 className="text-2xl font-bold text-orange-500 mb-3">The Golden Mic</h3>
            <p className="text-slate-200">
              Winner of each show holds the mic... but maybe not for long, as it's back up for grabs when the next round starts.
            </p>
          </div>
        </div>

        {/* WHY PLAY */}
        <div className="border-t-2 border-slate-600 pt-8 mb-12">
          <h2 className="text-2xl font-bold text-orange-500 text-center mb-6">WHY PLAY?</h2>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="text-2xl">✨</div>
              <div>
                <div className="font-bold text-slate-100">Spark creativity</div>
                <div className="text-sm text-slate-300">Prompts push you to think differently</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="text-2xl">🎭</div>
              <div>
                <div className="font-bold text-slate-100">Learn what makes your friends tick</div>
                <div className="text-sm text-slate-300">See how they think under pressure</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="text-2xl">😂</div>
              <div>
                <div className="font-bold text-slate-100">Get roasted by AI</div>
                <div className="text-sm text-slate-300">These judges don't hold back</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="text-2xl">🏆</div>
              <div>
                <div className="font-bold text-slate-100">Prove you're the better one-upper</div>
                <div className="text-sm text-slate-300">Let the game decide once and for all</div>
              </div>
            </div>
          </div>
        </div>

        {/* READY TO PLAY CTA */}
        <div className="border-t-2 border-slate-600 pt-8 mb-12">
          <h2 className="text-2xl font-bold text-orange-500 text-center mb-6">READY TO PLAY?</h2>
          <Link 
            to="/play"
            className="block w-full px-6 py-4 bg-orange-500 text-white text-lg font-bold rounded-lg hover:bg-orange-400 transition-all text-center"
          >
            Play Now
          </Link>
        </div>

        {/* FOOTER */}
        <div className="border-t-2 border-slate-600 pt-8 text-center space-y-4">
          <p className="text-slate-300 text-sm mb-2">
            Have feedback or ideas?<br />
            <a href="mailto:hello@oneupper.app" className="text-orange-500 hover:text-orange-400">hello@oneupper.app</a> - I promise I won't judge 😉
          </p>
          
          <p className="text-slate-400 text-xs">Beta Version - More features coming soon</p>
          
          {/* Copyright and Legal Links */}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-slate-500 text-xs mb-2">
              © 2025 One-Upper™. All rights reserved.
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <Link to="/privacy" className="text-slate-400 hover:text-orange-500 transition-colors">
                Privacy Policy
              </Link>
              <span className="text-slate-600">|</span>
              <Link to="/terms" className="text-slate-400 hover:text-orange-500 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}