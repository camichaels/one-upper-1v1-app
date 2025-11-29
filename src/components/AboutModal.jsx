// AboutModal.jsx
// "About One-Upper" modal with app info and contact
// Place in src/components/AboutModal.jsx

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border-2 border-orange-500 rounded-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-orange-500">One-Upper</h2>
        </div>

        {/* Content */}
        <div className="space-y-5 mb-8">
          <div>
            <h3 className="font-bold text-slate-100 mb-1">Built to unlock creativity.</h3>
            <p className="text-slate-300 text-sm">
              As we all focus on prompting AI... shouldn't we prompt our own brains too?
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-100 mb-1">Designed to battle wits.</h3>
            <p className="text-slate-300 text-sm">
              You know you're smarter, sneakier, and sillier... now prove it.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-100 mb-1">Created to laugh more.</h3>
            <p className="text-slate-300 text-sm">
              Everyone needs playful breaks... so enjoy One-Upper anytime, anywhere!
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mb-6 text-sm">
          <span className="text-slate-300">Ideas? </span>
          <a 
            href="mailto:hello@oneupper.app" 
            className="text-orange-500 hover:text-orange-400 transition-colors"
          >
            hello@oneupper.app
          </a>
        </div>

        {/* Made with love */}
        <div className="text-center text-slate-500 text-xs mb-6">
          Made with ❤️ in Belmont, CA
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}