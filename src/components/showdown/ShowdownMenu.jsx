import { useState } from 'react';
import ShowdownHowToPlay from './ShowdownHowToPlay';

export default function ShowdownMenu({ isHost, onLeave, onEndShowdown }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  function handleLeaveClick() {
    setShowMenu(false);
    setShowLeaveConfirm(true);
  }

  function handleEndClick() {
    setShowMenu(false);
    setShowEndConfirm(true);
  }

  function handleHowToPlayClick() {
    setShowMenu(false);
    setShowHowToPlay(true);
  }

  return (
    <>
      {/* Menu button - positioned in top right */}
      <div className="absolute top-8 right-5">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="text-slate-400 hover:text-slate-200 text-2xl p-2"
          aria-label="Menu"
        >
          ⋮
        </button>
        
        {showMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu dropdown */}
            <div className="absolute right-0 top-10 bg-slate-700 border border-slate-600 rounded-lg shadow-lg py-2 w-48 z-20">
              <button
                onClick={handleHowToPlayClick}
                className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                How to Play
              </button>
              
              {/* Non-host: Leave option */}
              {!isHost && (
                <button
                  onClick={handleLeaveClick}
                  className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                >
                  Leave Showdown
                </button>
              )}
              
              {/* Host: End option only */}
              {isHost && (
                <button
                  onClick={handleEndClick}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-600 transition-colors border-t border-slate-600"
                >
                  End Showdown
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <ShowdownHowToPlay onClose={() => setShowHowToPlay(false)} />
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Leave Showdown?
            </h3>
            <p className="text-slate-300 text-sm mb-6">
              You'll get 0 points for any remaining rounds.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-200 font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeave?.();
                }}
                className="flex-1 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-400 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Showdown Confirmation Modal (Host only) */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              End Showdown?
            </h3>
            <p className="text-slate-300 text-sm mb-6">
              This will end the game for everyone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-200 font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndShowdown?.();
                }}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-400 transition-colors"
              >
                End Showdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}