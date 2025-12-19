import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeaderWithBackAndMenu({ 
  backTo,
  backLabel = 'Back',
  onBack,
  onHowToPlay, 
  onAllRounds,
  onProfiles,
  onCancel,
  onLogOut,
  showAllRounds = true
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    }
  }

  return (
    <div className="relative flex items-center justify-center py-4">
      {/* Back button - left aligned */}
      <button
        onClick={handleBack}
        className="absolute left-0 text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1"
      >
        ← {backLabel}
      </button>
      
      {/* Logo - centered */}
      <img src="/logo-wide.png" alt="One-Upper" className="h-8" />
      
      {/* Menu button - right aligned */}
      <div className="absolute right-0 z-50">
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
              className="fixed inset-0 bg-black/20 z-[60]" 
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-[70]">
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
              
              {onLogOut && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onLogOut();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Log Out
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