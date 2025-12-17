import { useState } from 'react';

export default function HeaderWithMenu({ 
  onHowToPlay, 
  onAllRounds,
  onProfiles,
  onCancel,
  showAllRounds = true
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative flex items-center justify-center py-4">
      {/* Logo - centered */}
      <img src="/logo-wide.png" alt="One-Upper" className="h-8" />
      
      {/* Menu button - right aligned, vertically centered */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
        >
          ⋮
        </button>
        
        {showMenu && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
              {showAllRounds && onAllRounds && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onAllRounds();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  See All Rounds
                </button>
              )}
              
              {onProfiles && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onProfiles();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Your Profiles
                </button>
              )}
              
              {onHowToPlay && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onHowToPlay();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  How to Play
                </button>
              )}
              
              {onCancel && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onCancel();
                  }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 transition-colors border-t border-slate-700"
                >
                  Cancel Rivalry
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}