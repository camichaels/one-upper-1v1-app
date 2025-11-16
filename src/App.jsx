import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [prompts, setPrompts] = useState([]);
  const [judges, setJudges] = useState([]);
  const [randomJudges, setRandomJudges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testDatabase() {
      try {
        // Get 5 prompts
        const { data: promptsData } = await supabase
          .from('prompts')
          .select('*')
          .limit(5);

        // Get ALL judges
        const { data: allJudges } = await supabase
          .from('judges')
          .select('*');

        // Select 3 random judges (simulate game)
        const shuffled = [...allJudges].sort(() => 0.5 - Math.random());
        const selected3 = shuffled.slice(0, 3);

        setPrompts(promptsData);
        setJudges(allJudges);
        setRandomJudges(selected3);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }

    testDatabase();
  }, []);

  const selectNewJudges = async () => {
    const { data: allJudges } = await supabase
      .from('judges')
      .select('*');
    
    const shuffled = [...allJudges].sort(() => 0.5 - Math.random());
    const selected3 = shuffled.slice(0, 3);
    setRandomJudges(selected3);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          One-Upper Database Test ✅
        </h1>

        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            Random 3 Judges (Like Real Game)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Pool of {judges.length} judges → Randomly selected 3:
          </p>
          <ul className="space-y-2 mb-4">
            {randomJudges.map(judge => (
              <li key={judge.id} className="p-3 bg-purple-50 rounded border-2 border-purple-200">
                <span className="text-2xl mr-2">{judge.emoji}</span>
                <span className="font-semibold">{judge.name}</span>
                <p className="text-sm text-gray-600 mt-1">{judge.description}</p>
              </li>
            ))}
          </ul>
          <button
            onClick={selectNewJudges}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            🎲 Pick 3 Different Random Judges
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Sample Prompts</h2>
          <ul className="space-y-2">
            {prompts.map(prompt => (
              <li key={prompt.id} className="p-3 bg-gray-50 rounded">
                <span className="font-semibold">{prompt.category}:</span> {prompt.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;