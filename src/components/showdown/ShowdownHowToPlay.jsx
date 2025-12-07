export default function ShowdownHowToPlay({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border-2 border-orange-500 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-orange-500">How to Play</h2>
        </div>

        {/* The Goal */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
            🎯 The Goal
          </h3>
          <p className="text-slate-300 text-sm">
            Be the One-Upper. Outscore everyone across 5 rounds.
          </p>
        </div>

        {/* Each Round */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
            ⏱️ Each Round
          </h3>
          <ol className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">1.</span>
              <span>Everyone answers the same prompt (60 sec)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">2.</span>
              <span>Guess who wrote what + vote for the winner (45 sec)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">3.</span>
              <span>Judges rank all answers and award bonuses</span>
            </li>
          </ol>
        </div>

        {/* Scoring */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
            🏆 Scoring
          </h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>1st: 5 pts | 2nd: 3 pts | 3rd: 2 pts | 4th: 1 pt</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Bonus: "Most X" award (+1 pt)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Bonus: Best Guesser (+1 pt)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Bonus: Judge Whisperer - match the judges' pick (+1 pt)</span>
            </li>
          </ul>
        </div>

        {/* Tip */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
            💡 Tip
          </h3>
          <p className="text-slate-300 text-sm">
            Be bold. Be weird. Truth won't save you here.
          </p>
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