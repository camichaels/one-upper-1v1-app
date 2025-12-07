import { useNavigate } from 'react-router-dom';
import Header from './Header';

export default function GameModeChoice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      
      <div className="max-w-md mx-auto mt-8">
        {/* Tagline */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-orange-500">2 ways to play. 1 way to win.</h1>
          <p className="text-2xl font-bold text-slate-100 mt-1">Be the One-Upper!</p>
        </div>

        <div className="space-y-6">
          {/* Rivalry Option */}
          <button
            onClick={() => navigate('/play')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl p-6 transition-colors text-left border border-slate-600"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">🎤</span>
              <div>
                <h2 className="text-xl font-bold text-orange-500 mb-1">Rivalry</h2>
                <p className="text-slate-300 text-sm">
                  1-on-1 battle over 5 rounds
                </p>
                <p className="text-slate-300 text-sm">
                  Play at your own pace no matter where you are
                </p>
              </div>
            </div>
          </button>

          {/* Showdown Option */}
          <button
            onClick={() => navigate('/showdown')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl p-6 transition-colors text-left border border-slate-600"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚡</span>
              <div>
                <h2 className="text-xl font-bold text-orange-500 mb-1">Showdown</h2>
                <p className="text-slate-300 text-sm">
                  Live party game for 3-5 players
                </p>
                <p className="text-slate-300 text-sm">
                  Everyone plays together at the same place
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}