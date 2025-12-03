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
              <span>Every Rivalry is 5 Rounds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Both Players Answer the Same Prompt</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>3 AI Judges Score You (1-10 each)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Highest Total Score Wins the Round</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Tied Score? First to Submit Wins!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Most Round Wins Gets the Golden Mic 🎤</span>
            </li>
          </ul>
        </div>

        {/* Pro Tips */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-3">Pro Tips</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Be funny, creative, or outrageous</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Check out the judges' personalities (find ways to appeal to them)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Speed matters when it's close!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 flex-shrink-0">•</span>
              <span>Check out judge banter and past round scores</span>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-600 my-6"></div>

        {/* About Section */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-3">About One-Upper</h3>
          <p className="text-slate-300 text-sm mb-4">
            One-Upper turns the age-old art of one-upping your friends into a proper competition. 
            Challenge someone, answer creative prompts, and let AI judges decide who's got the better wit.
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Built for friendly rivalries, bragging rights, and those moments when you just 
            <em> know</em> you can top whatever they just said.
          </p>
          <div className="text-center space-y-2">
            <p className="text-slate-400 text-sm">
              Ideas? <a href="mailto:hello@oneupper.app" className="text-orange-400 hover:text-orange-300">hello@oneupper.app</a>
            </p>
            <p className="text-slate-500 text-xs">
              Made with ❤️ for competitive friends everywhere
            </p>
          </div>
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