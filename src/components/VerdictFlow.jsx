import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Header from './Header';
import HowToPlayModal from './HowToPlayModal';
import AllRoundsModal from './AllRoundsModal';
import GoldenMic from '../assets/microphone.svg';

// Ripley intro lines for Step 1 (random selection)
const ripleyIntros = [
  "Both answers are in. Let's see what you two came up with...",
  "Alright, answers locked! Time to see who brought their A-game.",
  "The responses are in. Let's see what we're working with...",
  "Both of you have spoken. Now let's see who said what.",
  "Answers submitted! Let's take a look at the competition.",
  "Time to reveal! What did you two come up with?",
  "The creative juices have flowed. Let's see the results...",
  "Both contestants have answered. Drumroll please...",
];

// Ripley lines for Step 2 (judge banter intro)
const ripleyBanterIntros = [
  "Judges, what are you thinking?",
  "Let's hear what the judges have to say...",
  "Over to you, judges!",
  "Judges, break it down for us.",
  "What's the verdict looking like, judges?",
  "Alright judges, give us the scoop.",
];

// Ripley verdict lines (triggered by situation)
const ripleyVerdictLines = {
  blowout_winner: [
    "That wasn't even close!",
    "Dominant performance right there.",
    "Someone brought their A-game today!",
  ],
  close_game: [
    "Now THAT was a battle!",
    "Could've gone either way!",
    "The judges had their work cut out for them!",
  ],
  streak_3: [
    "Three in a row! Someone's heating up!",
    "That's a hat trick! Momentum is building!",
    "Three straight! Can anyone stop this streak?",
  ],
  streak_4: [
    "Four in a row! This is getting serious!",
    "Domination mode: activated!",
    "Four straight wins! One more for the sweep!",
  ],
  perfect_sweep: [
    "FIVE FOR FIVE! A PERFECT SWEEP!",
    "Undefeated! Flawless victory!",
    "The clean sweep! Absolutely dominant!",
  ],
  comeback: [
    "And just like that, we've got a new leader!",
    "The comeback is ON!",
    "Momentum shift! This rivalry just got interesting!",
  ],
  final_round: [
    "And that's the final round! What a rivalry!",
    "That's a wrap on this rivalry!",
    "The last round is in the books!",
  ],
  default: [
    "Another round in the books!",
    "The judges have spoken!",
    "And there you have it!",
  ],
};

// Artifact configuration
const artifactConfig = {
  'celebrity_match': { icon: '⭐', label: 'Celebrity Match' },
  'fake_headline': { icon: '📰', label: 'Fake Headline' },
  'fact_check': { icon: '✅', label: 'Fact Check' },
  'rivalry_recap': { icon: '🎭', label: 'Rivalry Recap' },
};

export default function VerdictFlow({
  currentShow,
  rivalry,
  myProfile,
  opponentProfile,
  activeProfileId,
  previousShows,
  judgeProfiles,
  onNextRound,
  onNavigateToSummary,
  onNavigate,
  initialStep = 1,
  onStepChange,
}) {
  // DEBUG: Log initialStep and step
  console.log('[VerdictFlow] initialStep:', initialStep, 'will initialize step with this value');
  
  const [step, setStep] = useState(initialStep);
  const [ripleyIntro, setRipleyIntro] = useState('');
  const [ripleyBanterIntro, setRipleyBanterIntro] = useState('');
  const [ripleyVerdict, setRipleyVerdict] = useState('');
  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const confettiShownRef = useRef(false);

  // DEBUG: Log when step changes
  useEffect(() => {
    console.log('[VerdictFlow] step changed to:', step);
  }, [step]);

  // Sync step with parent when it changes
  useEffect(() => {
    console.log('[VerdictFlow] calling onStepChange with:', step);
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  // Initialize Ripley lines on mount
  useEffect(() => {
    console.log('[VerdictFlow useEffect] Running - currentShow.id:', currentShow?.id, 'previousShows.length:', previousShows.length);
    console.log('[VerdictFlow useEffect] previousShows ids:', previousShows.map(s => s.id));
    
    // Random intro for Step 1
    const randomIntro = ripleyIntros[Math.floor(Math.random() * ripleyIntros.length)];
    setRipleyIntro(randomIntro);

    // Random banter intro for Step 2
    const randomBanterIntro = ripleyBanterIntros[Math.floor(Math.random() * ripleyBanterIntros.length)];
    setRipleyBanterIntro(randomBanterIntro);

    // Determine verdict line based on situation
    const verdictLine = getVerdictLine();
    console.log('[VerdictFlow useEffect] verdictLine:', verdictLine);
    setRipleyVerdict(verdictLine);

    // Randomize starting artifact
    const artifacts = getAllArtifacts();
    if (artifacts.length > 0) {
      setCurrentArtifactIndex(Math.floor(Math.random() * artifacts.length));
    }
  }, [currentShow?.id]);

  // Confetti on Step 3 for winner (including tiebreaker wins)
  useEffect(() => {
    if (step === 3 && currentShow.winner_id === activeProfileId && !confettiShownRef.current) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      confettiShownRef.current = true;
    }
  }, [step, currentShow.winner_id, activeProfileId]);

  function getVerdictLine() {
    const isWinner = currentShow.winner_id === activeProfileId;
    const winnerScore = getTotalScore(currentShow.winner_id);
    const loserId = currentShow.winner_id === currentShow.profile_a_id 
      ? currentShow.profile_b_id 
      : currentShow.profile_a_id;
    const loserScore = getTotalScore(loserId);
    const scoreDiff = winnerScore - loserScore;
    
    // Filter out current show to avoid double-counting
    const pastShows = previousShows.filter(s => s.id !== currentShow.id);
    
    // DEBUG: Log streak calculation
    console.log('[VerdictFlow] Streak calc - currentShow.id:', currentShow.id, 'show_number:', currentShow.show_number);
    console.log('[VerdictFlow] previousShows count:', previousShows.length, 'pastShows count:', pastShows.length);
    console.log('[VerdictFlow] pastShows:', pastShows.map(s => ({ id: s.id, show_number: s.show_number, winner_id: s.winner_id })));
    
    // Calculate current win streak for winner
    let winStreak = 1; // Current win counts
    const winnerId = currentShow.winner_id;
    for (const show of pastShows) {
      if (show.status === 'complete' && show.winner_id === winnerId) {
        winStreak++;
      } else {
        break;
      }
    }
    console.log('[VerdictFlow] winStreak:', winStreak, 'winnerId:', winnerId);

    // Check for lead change (comeback)
    const myWinsBefore = pastShows.filter(s => s.winner_id === activeProfileId).length;
    const oppWinsBefore = pastShows.filter(s => s.winner_id !== activeProfileId && s.winner_id).length;
    const myWinsNow = myWinsBefore + (isWinner ? 1 : 0);
    const oppWinsNow = oppWinsBefore + (isWinner ? 0 : 1);
    const wasLosingNowWinning = myWinsBefore < oppWinsBefore && myWinsNow > oppWinsNow;
    
    // Final round - use rivalry.match_length from database
    const matchLength = rivalry?.match_length || 5;
    if (currentShow.show_number === matchLength) {
      return getRandomLine(ripleyVerdictLines.final_round);
    }
    
    // Perfect sweep
    if (winStreak === 5) {
      return getRandomLine(ripleyVerdictLines.perfect_sweep);
    }
    
    // Streaks
    if (winStreak === 4) {
      return getRandomLine(ripleyVerdictLines.streak_4);
    }
    if (winStreak === 3) {
      return getRandomLine(ripleyVerdictLines.streak_3);
    }
    
    // Comeback
    if (wasLosingNowWinning) {
      return getRandomLine(ripleyVerdictLines.comeback);
    }
    
    // Blowout (6+ point difference)
    if (scoreDiff >= 6) {
      return getRandomLine(ripleyVerdictLines.blowout_winner);
    }
    
    // Close game (2 or less)
    if (scoreDiff <= 2) {
      return getRandomLine(ripleyVerdictLines.close_game);
    }
    
    return getRandomLine(ripleyVerdictLines.default);
  }

  function getRandomLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function getTotalScore(profileId) {
    if (!currentShow.judge_data?.scores) return 0;
    const isProfileA = profileId === currentShow.profile_a_id;
    return Object.values(currentShow.judge_data.scores).reduce((sum, data) => {
      return sum + (isProfileA ? data.profile_a_score : data.profile_b_score);
    }, 0);
  }

  function getWinnerName() {
    if (currentShow.winner_id === rivalry.profile_a_id) {
      return rivalry.profile_a.name;
    }
    return rivalry.profile_b.name;
  }

  function getMyAnswer() {
    return activeProfileId === currentShow.profile_a_id 
      ? currentShow.profile_a_answer 
      : currentShow.profile_b_answer;
  }

  function getOpponentAnswer() {
    return activeProfileId === currentShow.profile_a_id 
      ? currentShow.profile_b_answer 
      : currentShow.profile_a_answer;
  }

  function getAllArtifacts() {
    const artifacts = [];
    
    // Add rivalry_recap if exists
    if (currentShow.judge_data?.rivalry_comment) {
      artifacts.push({
        type: 'rivalry_recap',
        text: currentShow.judge_data.rivalry_comment.text,
        judge: currentShow.judge_data.rivalry_comment.judge,
      });
    }
    
    // Add other artifacts
    if (currentShow.judge_data?.artifacts) {
      artifacts.push(...currentShow.judge_data.artifacts);
    }
    
    return artifacts;
  }

  function cycleArtifact() {
    const artifacts = getAllArtifacts();
    if (artifacts.length > 1) {
      setCurrentArtifactIndex((prev) => (prev + 1) % artifacts.length);
    }
  }

  // Calculate scores and standings
  const winnerScore = getTotalScore(currentShow.winner_id);
  const loserId = currentShow.winner_id === currentShow.profile_a_id 
    ? currentShow.profile_b_id 
    : currentShow.profile_a_id;
  const loserScore = getTotalScore(loserId);
  const winnerName = getWinnerName();
  // Check if this was a tiebreaker (from judge_data or by comparing scores)
  const isTie = currentShow.judge_data?.was_tiebreaker || winnerScore === loserScore;
  
  // Filter out current show from previousShows to avoid double-counting
  const pastShows = previousShows.filter(s => s.id !== currentShow.id);
  
  const myWins = pastShows.filter(s => s.winner_id === activeProfileId).length + 
    (currentShow.winner_id === activeProfileId ? 1 : 0);
  const opponentWins = pastShows.filter(s => s.winner_id === opponentProfile.id).length +
    (currentShow.winner_id === opponentProfile.id ? 1 : 0);
  
  const iAmWinner = currentShow.winner_id === activeProfileId;
  const micHolderId = myWins > opponentWins ? activeProfileId : 
    (opponentWins > myWins ? opponentProfile.id : rivalry.mic_holder_id);

  // Menu component (reused across steps)
  const MenuButton = () => (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
      >
        ⋮
      </button>
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
            <button
              onClick={() => {
                setShowMenu(false);
                setShowAllRounds(true);
              }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
            >
              See All Rounds
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onNavigate('screen2');
              }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
            >
              Your Profiles
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowHowToPlay(true);
              }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
            >
              How to Play
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowCancelModal(true);
              }}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 border-t border-slate-700"
            >
              Cancel Rivalry
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Ripley bubble component (consistent with judge style)
  const RipleyBubble = ({ text }) => (
    <div className="bg-orange-500/10 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎙️</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-orange-500">Ripley</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );

  // STEP 1: The Answers
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-8" />
            <h2 className="text-xl font-bold text-slate-300">Round {currentShow.show_number} of {rivalry?.match_length || 5}</h2>
            <MenuButton />
          </div>

          {/* Prompt - moved before Ripley */}
          <div className="mb-4 text-center">
            <p className="text-xl font-bold text-slate-100">{currentShow.prompt}</p>
          </div>

          {/* Ripley intro */}
          <div className="mb-6">
            <RipleyBubble text={ripleyIntro} />
          </div>

          {/* My Answer - no border */}
          <div className="mb-3">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{myProfile.avatar}</span>
                <span className="font-bold text-slate-100">{myProfile.name}</span>
              </div>
              <p className="text-slate-200">{getMyAnswer()}</p>
            </div>
          </div>

          {/* Opponent Answer - no border */}
          <div className="mb-8">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{opponentProfile.avatar}</span>
                <span className="font-bold text-slate-100">{opponentProfile.name}</span>
              </div>
              <p className="text-slate-200">{getOpponentAnswer()}</p>
            </div>
          </div>

          {/* Next button - no arrow */}
          <button
            onClick={() => setStep(2)}
            className="w-full px-4 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold text-lg"
          >
            Hear from the judges
          </button>
        </div>

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
        {showCancelModal && (
          <CancelModal 
            opponentName={opponentProfile.name}
            onConfirm={() => {
              // Handle cancel - would need to pass this function
            }}
            onClose={() => setShowCancelModal(false)}
          />
        )}
      </div>
    );
  }

  // STEP 2: Judge Banter
  if (step === 2) {
    const banter = currentShow.judge_data?.banter || [];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Header row with Ripley intro instead of plain text */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-8" />
            <h2 className="text-xl font-bold text-slate-300">Round {currentShow.show_number} of {rivalry?.match_length || 5}</h2>
            <MenuButton />
          </div>

          {/* Ripley banter intro */}
          <div className="mb-6">
            <RipleyBubble text={ripleyBanterIntro} />
          </div>

          {/* Banter bubbles - no borders */}
          <div className="space-y-3 mb-8">
            {banter.map((line, i) => {
              const judge = judgeProfiles.find(j => j.key === line.judge);
              const isEven = i % 2 === 0;
              
              return (
                <div 
                  key={i} 
                  className={`flex ${isEven ? 'justify-start' : 'justify-end'}`}
                >
                  <div className="max-w-[85%]">
                    <div className="bg-slate-800/70 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{judge?.emoji || '❓'}</span>
                        <span className="text-sm font-bold text-slate-400">{judge?.name || line.judge}</span>
                      </div>
                      <p className="text-slate-200 text-sm">{line.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next button - no arrow, cleaner ellipsis */}
          <button
            onClick={() => setStep(3)}
            className="w-full px-4 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold text-lg"
          >
            And the winner is…
          </button>
        </div>

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
      </div>
    );
  }

  // STEP 3: The Reveal
  if (step === 3) {
    // AI headline - for now use verdict, later we'll add custom headline
    const headline = currentShow.judge_data?.headline || currentShow.verdict || '';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-8" />
            <h2 className="text-xl font-bold text-slate-300">Round {currentShow.show_number} of {rivalry?.match_length || 5}</h2>
            <MenuButton />
          </div>

          {/* Winner announcement */}
          <div className="text-center mb-6">
            {/* Golden mic for winner (even on tiebreaker - they still won!) */}
            {iAmWinner && (
              <div className="flex justify-center mb-2">
                <img src={GoldenMic} alt="mic" className="w-12 h-12" />
              </div>
            )}
            
            {/* Winner headline */}
            <h1 className="text-2xl font-bold text-orange-500 mb-2">
              {winnerName.toUpperCase()} WINS THE ROUND!
            </h1>
            
            {/* Score */}
            <p className="text-3xl font-bold text-slate-100 mb-3">
              {winnerScore} - {loserScore}
            </p>
            
            {/* Tiebreaker explanation or AI Headline */}
            {isTie ? (
              <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
                <p className="text-slate-300 text-sm">
                  <span className="text-orange-400 font-semibold">Tiebreaker!</span> {winnerName} submitted first.
                </p>
              </div>
            ) : headline ? (
              <p className="text-slate-300 italic text-lg mb-4">
                {headline}
              </p>
            ) : null}
          </div>

          {/* Rivalry Standings - no border */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-bold text-slate-400 text-center mb-3">RIVALRY STANDINGS</h3>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {micHolderId === activeProfileId && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
                  <span className="text-2xl font-bold text-slate-100">{myWins}</span>
                </div>
                <p className="text-sm text-slate-400">{myProfile.name}</p>
              </div>
              <div className="text-slate-600 text-2xl font-bold">-</div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {micHolderId === opponentProfile.id && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
                  <span className="text-2xl font-bold text-slate-100">{opponentWins}</span>
                </div>
                <p className="text-sm text-slate-400">{opponentProfile.name}</p>
              </div>
            </div>
          </div>

          {/* Ripley verdict */}
          <div className="mb-8">
            <RipleyBubble text={ripleyVerdict} />
          </div>

          {/* Next button - no arrow */}
          <button
            onClick={() => setStep(4)}
            className="w-full px-4 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold text-lg"
          >
            Get the breakdown
          </button>
        </div>

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
      </div>
    );
  }

  // STEP 4: The Breakdown
  if (step === 4) {
    const artifacts = getAllArtifacts();
    const currentArtifact = artifacts[currentArtifactIndex];
    const winnerProfile = currentShow.winner_id === rivalry.profile_a_id ? rivalry.profile_a : rivalry.profile_b;
    const loserProfile = currentShow.winner_id === rivalry.profile_a_id ? rivalry.profile_b : rivalry.profile_a;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-8" />
            <h2 className="text-xl font-bold text-slate-300">Round {currentShow.show_number} of {rivalry?.match_length || 5}</h2>
            <MenuButton />
          </div>

          {/* Prompt */}
          <div className="mb-4 text-center">
            <p className="text-lg font-semibold text-slate-300">{currentShow.prompt}</p>
          </div>

          {/* Tiebreaker note if applicable */}
          {isTie && (
            <div className="bg-slate-800/50 rounded-xl p-3 mb-4 text-center">
              <p className="text-slate-300 text-sm">
                <span className="text-orange-400 font-semibold">Tiebreaker:</span> {winnerProfile.name} submitted first
              </p>
            </div>
          )}

          {/* Winner Answer */}
          <div className="mb-2">
            <div className="bg-orange-500/15 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img src={GoldenMic} alt="mic" className="w-5 h-5" />
                  <span className="text-xl">{winnerProfile.avatar}</span>
                  <span className="font-bold text-slate-100">{winnerProfile.name}</span>
                </div>
                <span className="text-xl font-bold text-orange-500">{winnerScore}</span>
              </div>
              <p className="text-slate-200 text-sm">
                {currentShow.winner_id === currentShow.profile_a_id 
                  ? currentShow.profile_a_answer 
                  : currentShow.profile_b_answer}
              </p>
            </div>
          </div>

          {/* Loser Answer */}
          <div className="mb-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{loserProfile.avatar}</span>
                  <span className="font-bold text-slate-100">{loserProfile.name}</span>
                </div>
                <span className="text-xl font-bold text-slate-400">{loserScore}</span>
              </div>
              <p className="text-slate-200 text-sm">
                {loserId === currentShow.profile_a_id 
                  ? currentShow.profile_a_answer 
                  : currentShow.profile_b_answer}
              </p>
            </div>
          </div>

          {/* Judge Scores - separate boxes like before, no borders */}
          {currentShow.judge_data?.scores && (
            <div className="space-y-2 mb-4">
              {Object.entries(currentShow.judge_data.scores).map(([judgeKey, data]) => {
                const judge = judgeProfiles.find(j => j.key === judgeKey);
                const profileAScore = data.profile_a_score;
                const profileBScore = data.profile_b_score;
                
                // Higher scorer first for this judge
                const higherName = profileAScore >= profileBScore 
                  ? rivalry.profile_a.name 
                  : rivalry.profile_b.name;
                const higherScore = Math.max(profileAScore, profileBScore);
                const lowerName = profileAScore >= profileBScore 
                  ? rivalry.profile_b.name 
                  : rivalry.profile_a.name;
                const lowerScore = Math.min(profileAScore, profileBScore);
                
                return (
                  <div 
                    key={judgeKey} 
                    className="bg-slate-800/30 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{judge?.emoji || '❓'}</span>
                        <span className="text-sm font-bold text-slate-300">{judge?.name || judgeKey}</span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {higherName}: {higherScore} • {lowerName}: {lowerScore}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 italic">{data.comment}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Artifact - no border */}
          {currentArtifact && (
            <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{artifactConfig[currentArtifact.type]?.icon || '✨'}</span>
                  <span className="text-sm font-bold text-slate-300">
                    {artifactConfig[currentArtifact.type]?.label || 'Artifact'}
                  </span>
                </div>
                {artifacts.length > 1 && (
                  <button
                    onClick={cycleArtifact}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{currentArtifact.text}</p>
            </div>
          )}

          {/* Next button - no arrow */}
          <button
            onClick={() => {
              const matchLength = rivalry?.match_length || 5;
              if (currentShow.show_number === matchLength) {
                onNavigateToSummary();
              } else {
                onNextRound();
              }
            }}
            className="w-full px-4 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold text-lg"
          >
            {currentShow.show_number === (rivalry?.match_length || 5)
              ? 'See Rivalry Summary' 
              : `On to Round ${currentShow.show_number + 1}`}
          </button>
        </div>

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
      </div>
    );
  }

  return null;
}

// Cancel Modal Component
function CancelModal({ opponentName, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-slate-100 mb-2">
          Cancel Rivalry?
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          This will end your Rivalry with {opponentName}. Your history will be saved, but your opponent will be notified.
        </p>
        <p className="text-slate-400 text-sm mb-6">This cannot be undone.</p>
        <div className="space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-red-600 text-white font-medium rounded hover:bg-red-500"
          >
            Cancel Rivalry
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
          >
            Keep Playing
          </button>
        </div>
      </div>
    </div>
  );
}