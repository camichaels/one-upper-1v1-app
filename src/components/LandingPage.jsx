import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import GoldenMic from '../assets/microphone.svg';

// Sample rounds data for the carousel
const DEMO_ROUNDS = [
  {
    mode: 'RIVALRY',
    prompt: "What's a red flag that's actually a green flag?",
    players: [
      { name: 'Alex', emoji: '😎', answer: 'They cry during commercials', score: 21, isWinner: true },
      { name: 'Jordan', emoji: '🤓', answer: 'They own a sword', score: 15, isWinner: false },
    ],
    judge: {
      name: 'Savage Sarah',
      emoji: '😈',
      verdict: "A sword is a red flag. Crying at commercials? VULNERABLE. Easy."
    }
  },
  {
    mode: 'RIVALRY',
    prompt: "Worst thing to say at a funeral?",
    players: [
      { name: 'Casey', emoji: '😎', answer: 'Finally, some peace and quiet', score: 24, isWinner: true },
      { name: 'Morgan', emoji: '🤓', answer: 'He owed me money', score: 17, isWinner: false },
    ],
    judge: {
      name: 'Diva Delacroix',
      emoji: '🎭',
      verdict: "Morgan's was bitter. Casey's was DEVASTATING. Icon behavior."
    }
  },
  {
    mode: 'SHOWDOWN',
    prompt: "Rename a boring job to sound exciting",
    players: [
      { name: 'Drew', emoji: '🥇', answer: 'Janitor → Chaos Reversal Specialist', score: 26, isWinner: true },
      { name: 'Riley', emoji: '🥈', answer: 'Accountant → Number Wizard', score: 21, isWinner: false },
      { name: 'Sam', emoji: '🥉', answer: 'Mailman → Parcel Destiny Agent', score: 18, isWinner: false },
    ],
    judge: {
      name: 'Snoot Wellington III',
      emoji: '🎩',
      verdict: "Chaos Reversal Specialist has GRAVITAS. The others? Pedestrian."
    }
  }
];

// Featured judges for the preview
const FEATURED_JUDGES = [
  { name: 'Savage Sarah', emoji: '😈' },
  { name: 'Coach Kevin', emoji: '💪' },
  { name: 'Snoot III', emoji: '🎩' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);

  // Disable browser's automatic scroll restoration and scroll to top
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Auto-redirect returning users who already have a profile
  useEffect(() => {
    const activeProfileId = localStorage.getItem('activeProfileId');
    if (activeProfileId) {
      navigate('/go');
    }
  }, [navigate]);

  // Auto-advance carousel
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % DEMO_ROUNDS.length);
      }, 5000);
    }
    return () => clearInterval(autoPlayRef.current);
  }, [isAutoPlaying]);

  function handlePrevSlide() {
    setIsAutoPlaying(false);
    setCurrentSlide(prev => (prev - 1 + DEMO_ROUNDS.length) % DEMO_ROUNDS.length);
  }

  function handleNextSlide() {
    setIsAutoPlaying(false);
    setCurrentSlide(prev => (prev + 1) % DEMO_ROUNDS.length);
  }

  const currentRound = DEMO_ROUNDS[currentSlide];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      
      {/* HERO SECTION */}
      <section className="px-6 pt-12 pb-16 text-center">
        {/* Logo */}
        <img src="/logo.png" alt="One-Upper" className="w-64 mx-auto mb-8" />

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Finally settle who's funnier.
        </h2>

        {/* Value prop stack */}
        <div className="space-y-1 mb-10">
          <p className="text-lg text-slate-300">Ridiculous prompts.</p>
          <p className="text-lg text-slate-300">Unhinged answers.</p>
          <p className="text-lg text-slate-300">Ruthless AI judges.</p>
          <p className="text-lg text-slate-300">Brag rights forever.</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 max-w-xs mx-auto mb-8">
          <Link
            to="/play"
            className="w-full py-4 bg-orange-500 text-white font-semibold text-lg rounded-xl hover:bg-orange-400 transition-colors text-center"
          >
            Challenge a Friend
          </Link>
          <Link
            to="/showdown"
            className="w-full py-4 border-2 border-orange-500 text-orange-500 font-semibold text-lg rounded-xl hover:bg-orange-500/10 transition-colors text-center"
          >
            Start a Showdown
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="animate-bounce text-slate-400 text-sm">
          ↓ See it in action
        </div>
      </section>

      {/* LIVE DEMO CAROUSEL */}
      <section className="px-4 pb-16">
        <div className="max-w-md mx-auto">
          
          {/* Mode badge */}
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-1 bg-slate-800 text-orange-500 font-bold text-sm tracking-widest rounded-full">
              {currentRound.mode}
            </span>
          </div>

          {/* Prompt card */}
          <div className="bg-slate-800 rounded-xl p-5 mb-4 text-center">
            <p className="text-xl md:text-2xl font-medium text-white italic">
              "{currentRound.prompt}"
            </p>
          </div>

          {/* Player cards */}
          <div className="space-y-3 mb-4">
            {currentRound.players.map((player, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-4 transition-all ${
                  player.isWinner 
                    ? 'bg-amber-500/10' 
                    : 'bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{player.emoji}</span>
                    <span className="font-semibold text-white">{player.name}</span>
                  </div>
                  <span className={`font-bold text-lg ${player.isWinner ? 'text-amber-400' : 'text-slate-400'}`}>
                    {player.score}
                  </span>
                </div>
                <p className="text-slate-200 text-left">"{player.answer}"</p>
                {player.isWinner && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-amber-400 font-bold text-sm">🏆 WINNER</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Judge verdict */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{currentRound.judge.emoji}</span>
              <span className="font-semibold text-orange-500">{currentRound.judge.name}</span>
            </div>
            <p className="text-slate-300 italic">"{currentRound.judge.verdict}"</p>
          </div>

          {/* Carousel navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={handlePrevSlide}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex gap-2">
              {DEMO_ROUNDS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setCurrentSlide(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentSlide ? 'bg-orange-500' : 'bg-slate-600'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNextSlide}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* TWO WAYS TO PLAY */}
      <section className="px-6 pb-16">
        <h3 className="text-center text-orange-500 font-bold text-xl tracking-wide uppercase mb-8">
          Two Ways to Play
        </h3>

        <div className="max-w-md mx-auto space-y-4">
          {/* Rivalry card */}
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🎤</span>
              <h4 className="text-2xl font-bold text-orange-500">Rivalry</h4>
            </div>
            <p className="text-slate-400 text-sm mb-4">1v1 • Play anytime</p>
            <p className="text-slate-300 mb-5">
              Challenge a friend. Play on your time. 5 rounds decides who claims the Golden Mic.
            </p>
            <Link
              to="/play"
              className="block w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-400 transition-colors text-center"
            >
              Challenge a Friend
            </Link>
          </div>

          {/* Showdown card */}
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">⚡</span>
              <h4 className="text-2xl font-bold text-orange-500">Showdown</h4>
            </div>
            <p className="text-slate-400 text-sm mb-4">3-5 players • Live</p>
            <p className="text-slate-300 mb-5">
              Get the group on. Everyone answers at once. AI settles the score.
            </p>
            <Link
              to="/showdown"
              className="block w-full py-3 border-2 border-orange-500 text-orange-500 font-semibold rounded-xl hover:bg-orange-500/10 transition-colors text-center"
            >
              Start a Showdown
            </Link>
          </div>
        </div>
      </section>

      {/* WHY YOU'LL GET HOOKED */}
      <section className="px-6 pb-16">
        <h3 className="text-center text-orange-500 font-bold text-xl tracking-wide uppercase mb-8">
          Why You'll Get Hooked
        </h3>

        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <p className="text-slate-300">Finally use that chaotic brain energy</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">😈</span>
            <p className="text-slate-300">Go places polite conversation won't</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">👀</span>
            <p className="text-slate-300">Learn what your friends really think</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔥</span>
            <p className="text-slate-300">Get roasted (affectionately) by AI</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <p className="text-slate-300">Earn brag rights that actually mean something</p>
          </div>
        </div>
      </section>

      {/* MEET THE JUDGES */}
      <section className="px-6 pb-16">
        <h3 className="text-center text-orange-500 font-bold text-xl tracking-wide uppercase mb-4">
          Meet the Judges
        </h3>

        <div className="text-center mb-8 space-y-1">
          <p className="text-slate-300">25+ AI personalities.</p>
          <p className="text-slate-300">3 judges per game.</p>
          <p className="text-slate-300">None are pushovers.</p>
        </div>

        <div className="flex justify-center gap-3 mb-6 max-w-md mx-auto">
          {FEATURED_JUDGES.map((judge, idx) => (
            <div
              key={idx}
              className="flex-1 bg-slate-800 rounded-xl p-4 text-center"
            >
              <div className="text-4xl mb-2">{judge.emoji}</div>
              <p className="text-sm font-semibold text-white">{judge.name}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/judges"
            className="text-orange-500 hover:text-orange-400 transition-colors font-medium"
          >
            Meet all judges →
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-12">
        <div className="max-w-md mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Ready to let a supercomputer decide your fate?
          </h3>

          <div className="flex flex-col gap-3 mb-6">
            <Link
              to="/play"
              className="w-full py-4 bg-orange-500 text-white font-semibold text-lg rounded-xl hover:bg-orange-400 transition-colors text-center"
            >
              Challenge a Friend
            </Link>
            <Link
              to="/showdown"
              className="w-full py-4 border-2 border-orange-500 text-orange-500 font-semibold text-lg rounded-xl hover:bg-orange-500/10 transition-colors text-center"
            >
              Start a Showdown
            </Link>
          </div>

          <p className="text-slate-400">
            No cost. No app. Just receipts.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 border-t border-slate-800">
        <div className="max-w-md mx-auto text-center">
          <p className="text-slate-300 mb-2">Have feedback or ideas?</p>
          <a 
            href="mailto:hello@oneupper.app" 
            className="text-orange-500 hover:text-orange-400 transition-colors"
          >
            hello@oneupper.app
          </a>
          <p className="text-slate-400 mt-1">I promise I won't judge 😉</p>

          <p className="text-slate-500 text-sm mt-6 mb-4">
            Beta Version - More features coming soon
          </p>

          <div className="border-t border-slate-800 pt-6">
            <p className="text-slate-500 text-sm mb-2">© 2025 One-Upper™. All rights reserved.</p>
            <div className="flex justify-center gap-4 text-sm">
              <Link to="/privacy" className="text-slate-400 hover:text-slate-300 transition-colors">
                Privacy Policy
              </Link>
              <span className="text-slate-600">|</span>
              <Link to="/terms" className="text-slate-400 hover:text-slate-300 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}