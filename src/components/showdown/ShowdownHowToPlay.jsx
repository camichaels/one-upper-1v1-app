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
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            The Goal
          </h3>
          <p className="text-slate-300 text-sm">
            Outscore everyone across 5 rounds. Be the One-Upper.
          </p>
        </div>

        {/* Each Round */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            Each Round
          </h3>
          <ol className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">1.</span>
              <span>Everyone answers the same prompt</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">2.</span>
              <span>Guess who wrote what + who the judges will pick</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">3.</span>
              <span>Judges rate and rank your answers</span>
            </li>
          </ol>
        </div>

        {/* Scoring */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            Scoring
          </h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Rank higher, score more</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Bonus points awarded during rounds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Most points wins. Simple as that.</span>
            </li>
          </ul>
        </div>

        {/* Tip */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            Tip
          </h3>
          <p className="text-slate-300 text-sm">
            Be bold. Be weird. We're not fact-checking.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 my-6"></div>

        {/* About One-Upper */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-2">
            About One-Upper
          </h3>
          <p className="text-slate-300 text-sm mb-3">
            One-Upper turns the age-old art of one-upping your friends into a proper competition. Challenge someone, answer creative prompts, and let AI judges decide who's got the better wit.
          </p>
          <p className="text-slate-300 text-sm">
            Built for friendly rivalries, bragging rights, and those moments when you just <em>know</em> you can top whatever they just said.
          </p>
        </div>

        {/* Contact & Footer */}
        <div className="text-center mb-6">
          <p className="text-slate-400 text-sm mb-2">
            Ideas? <a href="mailto:hello@oneupper.app" className="text-orange-400 hover:text-orange-300">hello@oneupper.app</a>
          </p>
          <p className="text-slate-500 text-sm">
            Made with ❤️ for competitive friends everywhere
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