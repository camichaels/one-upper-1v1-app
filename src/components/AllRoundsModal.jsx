export default function AllRoundsModal({ 
  previousShows, 
  rivalry, 
  activeProfileId,
  onClose, 
  onSelectRound 
}) {
  // Sort by show number ascending
  const sortedShows = [...previousShows].sort((a, b) => a.show_number - b.show_number);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">All Rounds</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Rounds list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedShows.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No completed rounds yet.</p>
          ) : (
            sortedShows.map((show) => {
              // Get my profile and opponent profile
              const iAmProfileA = activeProfileId === rivalry.profile_a_id;
              const myName = iAmProfileA ? rivalry.profile_a.name : rivalry.profile_b.name;
              const opponentName = iAmProfileA ? rivalry.profile_b.name : rivalry.profile_a.name;
              
              // Calculate scores for me and opponent
              let myScore = 0;
              let opponentScore = 0;
              if (show.judge_data?.scores) {
                Object.values(show.judge_data.scores).forEach(data => {
                  if (iAmProfileA) {
                    myScore += data.profile_a_score;
                    opponentScore += data.profile_b_score;
                  } else {
                    myScore += data.profile_b_score;
                    opponentScore += data.profile_a_score;
                  }
                });
              }
              
              // Determine winner
              const iWon = myScore > opponentScore;
              const opponentWon = opponentScore > myScore;

              return (
                <button
                  key={show.id}
                  onClick={() => onSelectRound(show.id)}
                  className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-100">Round {show.show_number}</p>
                      <p className="text-sm text-slate-300 line-clamp-2">{show.prompt}</p>
                    </div>
                    <svg 
                      className="w-5 h-5 text-slate-500 flex-shrink-0 mt-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm">
                    <span className={iWon ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
                      {myName}: {myScore}
                    </span>
                    <span className="text-slate-500"> • </span>
                    <span className={opponentWon ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
                      {opponentName}: {opponentScore}
                    </span>
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}