// Randomized opening exclamations
const OPENINGS = [
  "OMG...",
  "WOW...",
  "Unbelievable...",
  "It's official...",
  "Breaking news...",
  "Well well well...",
  "Boom...",
  "And just like that..."
];

// Randomized hyperboles
const HYPERBOLES = [
  "ruthless",
  "preposterous", 
  "hilarious",
  "legendary",
  "chaotic",
  "unhinged",
  "epic",
  "wild",
  "absurd",
  "glorious"
];

// Get random item from array (seeded by rivalry ID for consistency)
function getSeededRandom(array, seed) {
  // Simple hash from string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % array.length;
  return array[index];
}

export default function ShareCard({ 
  winnerName,
  loserName,
  winnerScore,
  loserScore,
  stakes,
  samplePrompt,
  rivalryId
}) {
  // Use rivalry ID to seed randomness (so same rivalry = same card)
  const opening = getSeededRandom(OPENINGS, rivalryId || 'default');
  const hyperbole = getSeededRandom(HYPERBOLES, (rivalryId || 'default') + 'hyp');

  return (
    <div 
      id="share-card"
      className="w-80 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-2xl"
    >
      {/* Opening exclamation - Size A */}
      <div className="text-center text-orange-400 font-bold text-sm mb-1">
        {opening}
      </div>
      
      {/* Headline - Size B */}
      <div className="text-center text-white font-bold text-lg mb-2">
        {winnerName} One-Upped {loserName}, {winnerScore} to {loserScore}!
      </div>
      
      {/* Hyperbole line - Size A */}
      <div className="text-center text-slate-300 text-sm mb-3">
        It was a {hyperbole} rivalry for the ages.
      </div>
      
      {/* Winner declaration - Size B */}
      <div className="text-center text-orange-400 font-semibold text-lg mb-1">
        {winnerName} wins the Golden Mic! 🎉
      </div>
      
      {/* Stakes (optional) - Size B */}
      {stakes && (
        <div className="text-center text-orange-400 font-semibold text-lg mb-3">
          And {stakes}.
        </div>
      )}
      
      {/* Spacer if no stakes */}
      {!stakes && <div className="mb-2" />}
      
      {/* Prompt teaser - shaded box, Size A, left aligned text */}
      <div className="bg-slate-700/50 rounded-lg pt-2 pb-3 px-4 mb-3">
        <div className="text-slate-300 text-sm">How would you answer:</div>
        <div className="text-white text-sm italic">"{samplePrompt}"</div>
      </div>
      
      {/* URL - Size A */}
      <div className="text-center">
        <span className="text-orange-500 font-semibold text-sm">oneupper.app</span>
      </div>
    </div>
  );
}