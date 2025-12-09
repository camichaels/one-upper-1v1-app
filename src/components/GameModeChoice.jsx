import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './Header';

// Rotating taglines - random on load
const TAGLINES = [
  "Level up your thinking.",
  "Talk yourself up. We'll be the judge.",
  "Time to show up and show off.",
  "Think you're clever? Prove it.",
  "Outlast. Outwit. One-Up.",
  "Big talker? Back it up.",
  "Less humble. More brag.",
  "Showing off pays off.",
  "Best answer wins. Honesty optional.",
  "Exaggerate responsibly.",
  "Funnier than your friends? Prove it.",
  "Your wit, ranked by AI. Good luck.",
  "Outwit. Outplay. One-Up.",
  "Get weird. Get judged. Get crowned.",
  "Bold answers only.",
  "No wrong answers. Just losing ones.",
];

// Judge quotes - random on load
const JUDGE_QUOTES = [
  { text: "Bore me and I'll know.", judge: "Judge Savage", emoji: "🔥" },
  { text: "Safe answers finish last.", judge: "Judge Savage", emoji: "🔥" },
  { text: "Make me feel something. That's all I ask.", judge: "Judge Riley", emoji: "💙" },
  { text: "Heart wins here. Bring yours.", judge: "Judge Riley", emoji: "💙" },
  { text: "Impress me. Intellectually.", judge: "Judge Snoot", emoji: "🎓" },
  { text: "I award points for elegance. Plan accordingly.", judge: "Judge Snoot", emoji: "🎓" },
  { text: "Do you have what it takes? We'll find out.", judge: "Judge Coach", emoji: "💪" },
  { text: "Leave it all on the field.", judge: "Judge Coach", emoji: "💪" },
  { text: "My scoring logic? Wouldn't you like to know.", judge: "Judge Wildcard", emoji: "🎲" },
  { text: "I might love it. I might not. Even I don't know yet.", judge: "Judge Wildcard", emoji: "🎲" },
  { text: "Main character energy only, please.", judge: "Judge Diva", emoji: "🎬" },
  { text: "Give me drama or give me nothing.", judge: "Judge Diva", emoji: "🎬" },
  { text: "HUMOR.EXE loading... prepare for evaluation.", judge: "Judge GLiTCH", emoji: "🤖" },
  { text: "Your response will be processed. Resistance is suboptimal.", judge: "Judge GLiTCH", emoji: "🤖" },
  { text: "Explain 'funny' again? Slowly this time.", judge: "Judge Zorp", emoji: "👽" },
  { text: "Earth humor remains... confusing. But I am ready.", judge: "Judge Zorp", emoji: "👽" },
  { text: "Bars. Flow. Victory. Let's go.", judge: "Judge Hype", emoji: "🎤" },
  { text: "Spit your best. I'll judge the rest.", judge: "Judge Hype", emoji: "🎤" },
  { text: "Back in my day, we were actually funny.", judge: "Judge Gramps", emoji: "👴" },
  { text: "Show me something timeless, kid.", judge: "Judge Gramps", emoji: "👴" },
  { text: "Can this joke scale? Let's find out.", judge: "Judge Mogul", emoji: "💸" },
  { text: "Disrupt my expectations or pivot out.", judge: "Judge Mogul", emoji: "💸" },
  { text: "Your answer is a mirror. What will it reflect?", judge: "Judge Guru", emoji: "🧘" },
  { text: "The real one-upper was inside you all along. Maybe.", judge: "Judge Guru", emoji: "🧘" },
  { text: "Too wholesome and I'll pretend to hate it.", judge: "Judge Edge", emoji: "🔪" },
  { text: "Make it weird. I can take it.", judge: "Judge Edge", emoji: "🔪" },
  { text: "I've studied 10,000 jokes. Surprise me.", judge: "Judge Scholar", emoji: "📚" },
  { text: "Structurally, this should be interesting.", judge: "Judge Scholar", emoji: "📚" },
  { text: "Comedy is dead. Prove me wrong.", judge: "Judge Artiste", emoji: "🎨" },
  { text: "I don't expect you to understand my scoring.", judge: "Judge Artiste", emoji: "🎨" },
  { text: "No pain, no gain. Same goes for jokes.", judge: "Judge Tank", emoji: "🏋️" },
  { text: "Hit me with your PR. Personal Response.", judge: "Judge Tank", emoji: "🏋️" },
  { text: "Clutch or kick. Your call.", judge: "Judge Gamer", emoji: "🎮" },
  { text: "Time to lock in. No throwing.", judge: "Judge Gamer", emoji: "🎮" },
  { text: "I detect notes of... potential.", judge: "Judge Sommelier", emoji: "🍷" },
  { text: "Let's see if this answer has legs.", judge: "Judge Sommelier", emoji: "🍷" },
  { text: "Rules? I don't remember agreeing to rules.", judge: "Judge Chaos", emoji: "🎪" },
  { text: "Scoring is a construct. But I'll do it anyway.", judge: "Judge Chaos", emoji: "🎪" },
  { text: "This better be seasoned properly.", judge: "Judge Chef", emoji: "👨‍🍳" },
  { text: "Raw talent only. No microwaved answers.", judge: "Judge Chef", emoji: "👨‍🍳" },
  { text: "I've become the judge. There is no me anymore.", judge: "Judge Method", emoji: "🎭" },
  { text: "Show me truth. I'll know if you're faking.", judge: "Judge Method", emoji: "🎭" },
  { text: "Make some noise or get off the stage.", judge: "Judge Rockstar", emoji: "🎸" },
  { text: "This ain't soundcheck. Bring the arena energy.", judge: "Judge Rockstar", emoji: "🎸" },
  { text: "Hypothesis: you're funny. Let's test it.", judge: "Judge Scientist", emoji: "🔬" },
  { text: "Your humor will be measured. Precisely.", judge: "Judge Scientist", emoji: "🔬" },
  { text: "Everyone's a winner! But also, someone has to lose.", judge: "Judge Wholesome", emoji: "🌈" },
  { text: "I believe in you! Now don't let me down.", judge: "Judge Wholesome", emoji: "🌈" },
  { text: "I've witnessed a million joke deaths. Don't join them.", judge: "Judge Reaper", emoji: "💀" },
  { text: "Make me laugh, or join my list.", judge: "Judge Reaper", emoji: "💀" },
];

export default function GameModeChoice() {
  const navigate = useNavigate();
  const [tagline, setTagline] = useState('');
  const [judgeQuote, setJudgeQuote] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Pick random tagline and judge quote on mount
  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    setJudgeQuote(JUDGE_QUOTES[Math.floor(Math.random() * JUDGE_QUOTES.length)]);
    // Trigger fade-in animation
    setTimeout(() => setLoaded(true), 50);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      
      <div className="max-w-md mx-auto">
        {/* Tagline - with fade in */}
        <div className={`text-center mb-8 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-2xl font-bold text-orange-500">2 ways to play. 1 way to win.</p>
          <h1 className="text-2xl font-bold text-slate-100 mt-1 italic">{tagline}</h1>
        </div>

        <div className="space-y-6">
          {/* Rivalry Option - with staggered fade in and hover effects */}
          <button
            onClick={() => navigate('/play')}
            className={`w-full bg-slate-700 hover:bg-slate-600 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/10 text-slate-100 rounded-xl p-6 transition-all duration-300 text-left border border-slate-600 hover:border-orange-500/50 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">🎤</span>
              <div>
                <h2 className="text-xl font-bold text-orange-500 mb-1">Rivalry</h2>
                <p className="text-slate-300 text-sm">
                  One-on-one duel of wits.
                </p>
                <p className="text-slate-400 text-sm">
                  Settle a score from anywhere.
                </p>
              </div>
            </div>
          </button>

          {/* Showdown Option - with staggered fade in and hover effects */}
          <button
            onClick={() => navigate('/showdown')}
            className={`w-full bg-slate-700 hover:bg-slate-600 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/10 text-slate-100 rounded-xl p-6 transition-all duration-300 text-left border border-slate-600 hover:border-orange-500/50 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚡</span>
              <div>
                <h2 className="text-xl font-bold text-orange-500 mb-1">Showdown</h2>
                <p className="text-slate-300 text-sm">
                  Live party game for 3-5.
                </p>
                <p className="text-slate-400 text-sm">
                  Same room. Same prompt. Maximum chaos.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Judge Quote - with fade in */}
        {judgeQuote && (
          <div 
            className={`mt-10 text-center transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '450ms' }}
          >
            <p className="text-slate-400 italic text-sm">
              {judgeQuote.text}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {judgeQuote.emoji} {judgeQuote.judge}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}