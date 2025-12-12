import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import GoldenMic from '../assets/microphone.svg';

// Demo round data - one Rivalry, one Showdown
const DEMO_ROUNDS = [
  {
    mode: "rivalry",
    title: "How a Rivalry Plays Out",
    prompt: "Worst thing to say at a funeral?",
    step2Subhead: "Take your time. Play from anywhere.",
    step3Subhead: "Three AI judges score each answer. Best total wins.",
    players: [
      { icon: "🤓", name: "Alex", isYou: true, answer: "Finally, some peace and quiet" },
      { icon: "🦄", name: "Morgan", isYou: false, answer: "He owed me money" }
    ],
    winnerIndex: 0,
    winnerHeadline: "Alex claims the mic with an absolutely devastating take",
    cycle: [
      { type: "judge", emoji: "🎭", name: "Diva", text: "Morgan's was bitter. Alex's was DEVASTATING. Icon behavior." },
      { type: "artifact", icon: "⭐", label: "Celebrity Match", text: "Alex's answer has strong Aubrey Plaza energy" },
      { type: "judge", emoji: "🔥", name: "Savage", text: "Cold. Brutal. I respect it." },
      { type: "artifact", icon: "📰", label: "In related news...", text: "Breaking: Local Funeral Ruined By One-Liner" },
      { type: "judge", emoji: "💪", name: "Coach", text: "Alex went for the knockout punch. That's how you WIN." },
      { type: "artifact", icon: "🤓", label: "Actually...", text: "Fact Check: Our research team rates this Emotionally Violent" }
    ]
  },
  {
    mode: "showdown",
    title: "How a Showdown Plays Out",
    prompt: "Worst excuse for being late to work?",
    step2Subhead: "Same room. Same moment. 60 seconds.",
    step3Subhead: "Three AI judges crown a champion",
    players: [
      { icon: "🤓", name: "Alex", isYou: true, answer: "Traffic of ghosts" },
      { icon: "🦄", name: "Sam", isYou: false, answer: "My dog ate my keys" },
      { icon: "🎸", name: "Jamie", isYou: false, answer: "Time is a flat circle" },
      { icon: "🌵", name: "Riley", isYou: false, answer: "I was early yesterday" }
    ],
    winnerIndex: 2,
    winnerHeadline: "Jamie is crowned champion with philosophical chaos",
    cycle: [
      { type: "judge", emoji: "🎭", name: "Diva", text: "Time is a flat circle? UNHINGED. I'm obsessed." },
      { type: "artifact", icon: "⭐", label: "Celebrity Match", text: "Jamie's answer radiates chaotic Matthew McConaughey energy" },
      { type: "judge", emoji: "🔥", name: "Savage", text: "Everyone else made excuses. Jamie questioned reality. Legend." },
      { type: "artifact", icon: "📰", label: "In related news...", text: "Breaking: Local Employee Too Philosophical To Fire" },
      { type: "judge", emoji: "💪", name: "Coach", text: "That's not an excuse, that's a LIFESTYLE. Champion mentality!" },
      { type: "artifact", icon: "🤓", label: "Actually...", text: "Fact Check: Time is, in fact, not a flat circle" }
    ]
  }
];

// Game Demo Animation Component
function GameDemoAnimation() {
  const [currentRound, setCurrentRound] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  
  const round = DEMO_ROUNDS[currentRound];
  const isShowdown = round.mode === "showdown";

  // Player color tints for up to 4 players
  const playerColors = [
    { bg: "bg-emerald-900/40", border: "border-emerald-700/50", text: "text-emerald-400", subtext: "text-emerald-600" },
    { bg: "bg-violet-900/40", border: "border-violet-700/50", text: "text-violet-400", subtext: "text-violet-600" },
    { bg: "bg-amber-900/40", border: "border-amber-700/50", text: "text-amber-400", subtext: "text-amber-600" },
    { bg: "bg-rose-900/40", border: "border-rose-700/50", text: "text-rose-400", subtext: "text-rose-600" }
  ];

  // Intersection Observer to trigger animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          runAnimation();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  // Cycle through judges and artifacts
  useEffect(() => {
    if (animationStep < 3) return;
    
    const interval = setInterval(() => {
      setCycleIndex(prev => (prev + 1) % round.cycle.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [animationStep, round.cycle.length]);

  // Animation sequence
  function runAnimation() {
    setAnimationStep(0);
    setCycleIndex(0);
    
    // Step 1: Prompt (immediate)
    setTimeout(() => setAnimationStep(1), 100);
    
    // Step 2: Answers (after 1s)
    setTimeout(() => setAnimationStep(2), 1200);
    
    // Step 3: Verdict (after 2.5s)
    setTimeout(() => setAnimationStep(3), 2800);
  }

  // Navigate rounds
  function goToRound(index) {
    setCurrentRound(index);
    setAnimationStep(0);
    setCycleIndex(0);
    setTimeout(() => runAnimation(), 100);
  }

  function nextRound() {
    goToRound((currentRound + 1) % DEMO_ROUNDS.length);
  }

  function prevRound() {
    goToRound((currentRound - 1 + DEMO_ROUNDS.length) % DEMO_ROUNDS.length);
  }

  const currentCycleItem = round.cycle[cycleIndex];

  return (
    <div ref={containerRef} className="relative">
      {/* Dynamic header */}
      <h2 className="text-orange-500 font-bold text-sm uppercase tracking-widest text-center mb-10">
        {round.title}
      </h2>

      {/* Timeline line */}
      <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-700" />

      {/* STEP 1: THE PROMPT */}
      <div className={`relative pl-14 pb-6 transition-all duration-500 ${
        animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Timeline dot */}
        <div className="absolute left-4 w-5 h-5 rounded-full bg-orange-500 border-4 border-slate-800" />
        
        <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">
          Step 1: The Prompt
        </div>
        <p className="text-slate-400 text-sm mb-3">
          {isShowdown ? "Everyone gets the same prompt" : "Both players get the same ridiculous prompt"}
        </p>
        
        <div className="bg-slate-700/50 rounded-xl p-4">
          <p className="text-white text-lg font-medium text-center">
            {round.prompt}
          </p>
        </div>
      </div>

      {/* Arrow */}
      <div className={`text-center text-slate-500 text-xl pb-3 transition-all duration-300 ${
        animationStep >= 1 ? 'opacity-100' : 'opacity-0'
      }`}>↓</div>

      {/* STEP 2: THE ANSWERS */}
      <div className={`relative pl-14 pb-6 transition-all duration-500 ${
        animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Timeline dot */}
        <div className="absolute left-4 w-5 h-5 rounded-full bg-orange-500 border-4 border-slate-800" />
        
        <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">
          Step 2: The Answers
        </div>
        <p className="text-slate-400 text-sm mb-3">
          {round.step2Subhead}
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {round.players.map((player, idx) => {
            const colors = playerColors[idx];
            return (
              <div 
                key={idx}
                className={`${colors.bg} ${colors.border} border rounded-xl p-3 transition-all duration-500 ${
                  animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-lg">{player.icon}</span>
                  <span className={`${colors.text} font-semibold text-sm`}>{player.name}</span>
                  {player.isYou && <span className={`${colors.subtext} text-xs`}>(You)</span>}
                </div>
                <p className="text-white text-sm">{player.answer}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrow */}
      <div className={`text-center text-slate-500 text-xl pb-3 transition-all duration-300 ${
        animationStep >= 2 ? 'opacity-100' : 'opacity-0'
      }`}>↓</div>

      {/* STEP 3: THE VERDICT */}
      <div className={`relative pl-14 pb-4 transition-all duration-500 ${
        animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Timeline dot */}
        <div className="absolute left-4 w-5 h-5 rounded-full bg-orange-500 border-4 border-slate-800" />
        
        <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">
          Step 3: The Verdict
        </div>
        <p className="text-slate-400 text-sm mb-3">
          {round.step3Subhead}
        </p>
        
        {/* Winner banner */}
        <div className={`bg-orange-500 rounded-xl p-4 text-center mb-3 transition-all duration-300 ${
          animationStep >= 3 ? 'scale-100' : 'scale-95'
        }`}>
          <p className="text-white font-bold text-lg">{round.winnerHeadline}</p>
        </div>
        
        {/* Judge quote / Artifact (cycles) */}
        <div className="bg-slate-700/50 rounded-xl p-4 min-h-[100px] transition-all duration-300">
          <div key={`cycle-${cycleIndex}`} className="animate-fade-in">
            {currentCycleItem.type === "judge" ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{currentCycleItem.emoji}</span>
                  <span className="text-white font-semibold">Judge {currentCycleItem.name}</span>
                </div>
                <p className="text-slate-300 text-sm">{currentCycleItem.text}</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{currentCycleItem.icon}</span>
                  <span className="text-white font-semibold">{currentCycleItem.label}</span>
                </div>
                <p className="text-slate-300 text-sm">{currentCycleItem.text}</p>
              </>
            )}
          </div>
        </div>

        {/* 5 rounds context */}
        <p className="text-slate-400 text-sm mt-4">
          5 rounds. Most wins takes the Golden Mic.
        </p>
      </div>

      {/* Round navigation */}
      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-700">
        <button
          onClick={prevRound}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Previous"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex gap-2">
          {DEMO_ROUNDS.map((r, idx) => (
            <button
              key={idx}
              onClick={() => goToRound(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentRound ? 'bg-orange-500' : 'bg-slate-600 hover:bg-slate-500'
              }`}
              aria-label={`Go to ${r.mode}`}
            />
          ))}
        </div>
        
        <button
          onClick={nextRound}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Next"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const demoRef = useRef(null);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [featuredJudges, setFeaturedJudges] = useState([]);

  // Fetch featured judges from supabase
  useEffect(() => {
    async function loadFeaturedJudges() {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .in('name', ['Savage', 'Coach', 'Snoot']);
      
      if (!error && data) {
        // Sort to consistent order
        const order = ['Savage', 'Coach', 'Snoot'];
        const sorted = data.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        setFeaturedJudges(sorted);
      }
    }
    loadFeaturedJudges();
  }, []);

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

  // Smooth scroll to demo section
  function scrollToDemo() {
    demoRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      
      {/* ============================================ */}
      {/* HERO - Complete */}
      {/* ============================================ */}
      <section className="px-6 pt-10 pb-16 text-center bg-slate-900">
        {/* Logo */}
        <img src="/logo.png" alt="One-Upper" className="w-48 mx-auto mb-8" />

        {/* Headline */}
        <h1 className="text-xl md:text-2xl font-bold text-white mb-6">
          Finally settle who's funnier.
        </h1>

        {/* Value prop stack */}
        <div className="space-y-2 mb-10">
          <p className="text-lg text-slate-300">Ridiculous prompts.</p>
          <p className="text-lg text-slate-300">Unhinged answers.</p>
          <p className="text-lg text-slate-300">Ruthless AI judges.</p>
          <p className="text-lg text-slate-300">Brag rights forever.</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 max-w-xs mx-auto mb-10">
          <Link
            to="/play"
            className="w-full py-4 bg-orange-500 text-white font-semibold text-lg rounded-xl hover:bg-orange-400 transition-colors text-center"
          >
            Challenge a Friend
          </Link>
          <Link
            to="/showdown"
            className="w-full py-4 bg-orange-500 text-white font-semibold text-lg rounded-xl hover:bg-orange-400 transition-colors text-center"
          >
            Start a Showdown
          </Link>
        </div>

        {/* Scroll hint - clickable */}
        <button 
          onClick={scrollToDemo}
          className="text-slate-400 hover:text-orange-400 transition-colors group"
        >
          <span className="block mb-2 text-sm">See how it works</span>
          <span className="block text-2xl animate-bounce group-hover:text-orange-400">↓</span>
        </button>
      </section>

      {/* ============================================ */}
      {/* GAME DEMO - Complete */}
      {/* ============================================ */}
      <section ref={demoRef} className="px-6 py-16 bg-slate-800">
        <div className="max-w-md mx-auto">
          <GameDemoAnimation />
        </div>
      </section>

      {/* ============================================ */}
      {/* STAKES - Complete */}
      {/* ============================================ */}
      <section className="px-6 py-16 bg-slate-900">
        <div className="max-w-md mx-auto text-center">
          {/* Section header */}
          <h2 className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-8">
            What's at Stake
          </h2>
          
          {/* Golden Mic */}
          <img 
            src={GoldenMic} 
            alt="Golden Mic" 
            className="w-20 h-20 mx-auto mb-6"
          />
          
          {/* Tagline */}
          <h2 className="text-2xl font-bold text-white mb-2">
            1 Golden Mic
          </h2>
          <h2 className="text-2xl font-bold text-white mb-8">
            0 excuses
          </h2>
          
          {/* Stats */}
          <div className="space-y-3 text-slate-300">
            <p>🎤 147 rivalries started this week</p>
            <p>🌮 28 taco dinners wagered</p>
            <p>💔 3 friendships taking a break</p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TWO WAYS TO PLAY - Complete */}
      {/* ============================================ */}
      <section className="px-6 py-16 bg-slate-800">
        <div className="max-w-md mx-auto">
          <h2 className="text-orange-500 font-bold text-sm uppercase tracking-widest text-center mb-8">
            Two Ways to Play
          </h2>

          <div className="space-y-4">
            {/* Rivalry card */}
            <div className="bg-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">🎤</span>
                <h3 className="text-xl font-bold text-orange-500">Rivalry</h3>
              </div>
              <p className="text-slate-400 text-base mb-4">One-on-One · Play anytime</p>
              <p className="text-slate-300 mb-5">
                Challenge a friend, anywhere. Winner takes the mic.
              </p>
              <Link
                to="/play"
                className="block w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-400 transition-colors text-center"
              >
                Start a Rivalry
              </Link>
            </div>

            {/* Showdown card */}
            <div className="bg-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">⚡</span>
                <h3 className="text-xl font-bold text-orange-500">Showdown</h3>
              </div>
              <p className="text-slate-400 text-base mb-4">3-5 players · Live play</p>
              <p className="text-slate-300 mb-5">
                Same room, same time. Crown a champion.
              </p>
              <Link
                to="/showdown"
                className="block w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-400 transition-colors text-center"
              >
                Start a Showdown
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* THE VIBE - Complete */}
      {/* ============================================ */}
      <section className="px-6 py-16 bg-slate-900">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-6">
            Why Play
          </h2>
          
          <p className="text-xl font-bold text-white mb-8">
            Part brain boost, all buddy boast
          </p>

          <div className="space-y-4">
            <p className="text-slate-300">💡 Flex your creative muscles</p>
            <p className="text-slate-300">😈 Go places polite convo won't</p>
            <p className="text-slate-300">👀 See how your friends really think</p>
            <p className="text-slate-300">🔥 Get roasted by AI (affectionately)</p>
            <p className="text-slate-300">🏆 Settle it once and for all</p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* JUDGES - Complete */}
      {/* ============================================ */}
      <section className="px-6 py-16 bg-slate-800">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-orange-500 font-bold text-sm uppercase tracking-widest mb-6">
            Meet the Judges
          </h2>
          
          <p className="text-slate-300 mb-8">
            25 AI personalities. 3 judge each game. None are pushovers.
          </p>

          {/* Judge cards */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {featuredJudges.length > 0 ? (
              featuredJudges.map((judge, index) => {
                // Short quotes for display
                const shortQuotes = [
                  "\"I've seen better.\"",
                  "\"Now THAT'S effort!\"", 
                  "\"How pedestrian.\""
                ];
                return (
                  <button 
                    key={judge.key}
                    onClick={() => setSelectedJudge(judge)}
                    className="bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-4xl block mb-2">{judge.emoji}</span>
                    <p className="text-white font-semibold text-sm">{judge.name}</p>
                    <p className="text-slate-400 text-xs mt-2 italic">{shortQuotes[index]}</p>
                  </button>
                );
              })
            ) : (
              // Fallback while loading
              <>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <span className="text-4xl block mb-2">🔥</span>
                  <p className="text-white font-semibold text-sm">Savage</p>
                  <p className="text-slate-400 text-xs mt-2 italic">"I've seen better."</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <span className="text-4xl block mb-2">💪</span>
                  <p className="text-white font-semibold text-sm">Coach</p>
                  <p className="text-slate-400 text-xs mt-2 italic">"That's how you DO IT!"</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <span className="text-4xl block mb-2">🎩</span>
                  <p className="text-white font-semibold text-sm">Snoot</p>
                  <p className="text-slate-400 text-xs mt-2 italic">"How pedestrian."</p>
                </div>
              </>
            )}
          </div>

          <Link 
            to="/judges" 
            className="text-orange-500 hover:text-orange-400 transition-colors font-medium"
          >
            See them all →
          </Link>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL CTA - Complete */}
      {/* ============================================ */}
      <section className="px-6 py-16 bg-slate-900">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-8">
            Ready to let a supercomputer decide your fate?
          </h2>
          
          <div className="flex flex-col gap-3 max-w-xs mx-auto mb-8">
            <Link
              to="/play"
              className="w-full py-4 bg-orange-500 text-white font-semibold text-lg rounded-xl hover:bg-orange-400 transition-colors text-center"
            >
              Challenge a Friend
            </Link>
            <Link
              to="/showdown"
              className="w-full py-4 bg-orange-500 text-white font-semibold text-lg rounded-xl hover:bg-orange-400 transition-colors text-center"
            >
              Start a Showdown
            </Link>
          </div>
          
          <p className="text-slate-400">
            No cost. No app. Just receipts.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER - Complete */}
      {/* ============================================ */}
      <footer className="px-6 py-8 border-t border-slate-800 bg-slate-900">
        <div className="max-w-md mx-auto text-center">
          <p className="text-slate-400 mb-2">Have feedback or ideas?</p>
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

      {/* Judge Profile Modal */}
      {selectedJudge && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">{selectedJudge.emoji}</div>
              <h2 className="text-2xl font-bold text-orange-500">{selectedJudge.name}</h2>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-400 mb-1">JUDGING STYLE:</h3>
              <p className="text-slate-200">{selectedJudge.description}</p>
            </div>
            
            {selectedJudge.examples && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-400 mb-2">CLASSIC ONE-LINERS:</h3>
                <div className="space-y-1">
                  {selectedJudge.examples.split('|').map((example, i) => {
                    const cleanExample = example.trim();
                    const oneLiners = cleanExample.split(/",\s*"/).map(line => 
                      line.replace(/^["']|["']$/g, '').trim()
                    );
                    
                    return oneLiners.map((oneLiner, j) => (
                      <div key={`${i}-${j}`} className="text-sm text-slate-300 italic">
                        "{oneLiner}"
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setSelectedJudge(null)}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}