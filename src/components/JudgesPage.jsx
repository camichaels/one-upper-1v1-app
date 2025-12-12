import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function JudgesPage() {
  const navigate = useNavigate();
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJudge, setSelectedJudge] = useState(null);

  useEffect(() => {
    loadJudges();
  }, []);

  async function loadJudges() {
    const { data, error } = await supabase
      .from('judges')
      .select('*');

    if (!error && data) {
      // Randomize the order
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setJudges(shuffled);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400">Loading judges...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Back button left, logo centered - same row */}
          <div className="relative flex items-center justify-center mb-8">
            <button
              onClick={() => navigate('/')}
              className="absolute left-0 flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors text-sm"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <img src="/logo-wide.png" alt="One-Upper" className="h-10" />
          </div>

          {/* Page Title - Centered */}
          <h2 className="text-3xl font-bold text-orange-500 text-center">Meet the Judges</h2>
          
        </div>

        {/* Judge Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {judges.map((judge) => (
            <button
              key={judge.key}
              onClick={() => setSelectedJudge(judge)}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 hover:border-slate-600 transition-all text-center"
            >
              <div className="text-5xl mb-2">{judge.emoji}</div>
              <div className="font-bold text-slate-100 mb-1">{judge.name}</div>
              <div className="text-xs text-slate-400 line-clamp-2">{judge.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Judge Profile Modal - Reused from Screen4 */}
      {selectedJudge && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">{selectedJudge.emoji}</div>
              <h2 className="text-2xl font-bold text-orange-500">{selectedJudge.name}</h2>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-400 mb-1">JUDGING STYLE:</h3>
              <p className="text-slate-200">{selectedJudge.description}</p>
            </div>
            
            {selectedJudge.examples && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-400 mb-2">CLASSIC ONE-LINERS:</h3>
                <div className="space-y-1">
                  {selectedJudge.examples.split('|').map((example, i) => {
                    // Parse by commas within quotes to separate one-liners
                    const cleanExample = example.trim();
                    // Split by ", " pattern to get individual quotes
                    const oneLiners = cleanExample.split(/",\s*"/).map(line => 
                      line.replace(/^["']|["']$/g, '').trim()
                    );
                    
                    return oneLiners.map((oneLiner, j) => (
                      <div key={`${i}-${j}`} className="text-sm text-slate-300 italic">
                        "{oneLiner}"
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setSelectedJudge(null)}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}