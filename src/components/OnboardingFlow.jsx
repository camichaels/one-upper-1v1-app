import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header from './Header';

// 5 hardcoded practice prompts
const PRACTICE_PROMPTS = [
  "Describe your morning routine like a nature documentary narrator",
  "What's the worst superpower that sounds good at first?",
  "Explain your job to a medieval peasant",
  "What's a conspiracy theory you'd start about yourself?",
  "Pitch a terrible business idea with complete confidence"
];

export default function OnboardingFlow({ profile, onComplete }) {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Practice, 3: Results
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [judges, setJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [isJudging, setIsJudging] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Load random judges on mount
  useEffect(() => {
    loadJudges();
    // Pick random practice prompt
    const randomPrompt = PRACTICE_PROMPTS[Math.floor(Math.random() * PRACTICE_PROMPTS.length)];
    setPrompt(randomPrompt);
  }, []);

  async function loadJudges() {
    try {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Shuffle and take 3
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setJudges(shuffled.slice(0, 3));
    } catch (err) {
      console.error('Failed to load judges:', err);
    }
  }

  function handleAnswerChange(e) {
    const text = e.target.value;
    setAnswer(text);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }

  async function handleSubmitPractice() {
    if (!answer.trim() || wordCount > 30) return;
    
    setIsJudging(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('judge-practice', {
        body: {
          prompt: prompt,
          answer: answer.trim(),
          judges: judges.map(j => ({
            key: j.key,
            name: j.name,
            emoji: j.emoji,
            description: j.description
          }))
        }
      });

      if (error) throw error;

      setResults(data);
      setStep(3);
    } catch (err) {
      console.error('Practice judging failed:', err);
      setError('Something went wrong. Try again?');
    } finally {
      setIsJudging(false);
    }
  }

  async function handleComplete() {
    // Mark onboarding as complete
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id);
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
    }
    
    onComplete();
  }

  function handleSkip() {
    // Mark as complete even when skipping
    handleComplete();
  }

  // STEP 1: Welcome
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Ripley message bubble */}
          <div className="bg-orange-500/10 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎙️</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-orange-500">Ripley</span>
                </div>
                <div className="text-slate-200 text-sm leading-relaxed space-y-3">
                  <p>
                    Hey {profile.name}! Welcome to One-Upper.
                  </p>
                  <p>
                    Fair warning: this isn't about sharing your truth. It's about being <span className="text-orange-400 font-semibold">bolder</span>, <span className="text-orange-400 font-semibold">weirder</span>, and more <span className="text-orange-400 font-semibold">memorable</span> than whoever you're up against.
                  </p>
                  <p>
                    Draw from real life? Sure. But then crank it up. The judges don't want safe. They want swings.
                  </p>
                  <p className="text-slate-300">
                    Ready to see what I mean?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Try a Practice Round
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-600/50 font-medium rounded-xl transition-colors"
            >
              Skip, I'm ready to play
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Practice Prompt
  if (step === 2) {
    // Judging state - matches gameplay style
    if (isJudging) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
          <Header />
          <div className="max-w-md mx-auto">
            {/* Deliberating message */}
            <div className="text-center space-y-8 mt-16">
              <div className="text-xl text-slate-200 font-medium">JUDGES DELIBERATING...</div>
              
              {/* Orbiting judges - matching gameplay */}
              <div className="relative w-48 h-48 mx-auto">
                <div className="judges-orbit w-full h-full relative">
                  {judges.map((judge, i) => {
                    const angle = (i * 120 - 90) * (Math.PI / 180);
                    const radius = 70;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    return (
                      <div
                        key={judge.key}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        }}
                      >
                        <div className="judge-item-inner flex flex-col items-center">
                          <span className="text-4xl">{judge.emoji}</span>
                          <span className="text-xs text-slate-400 mt-1">{judge.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Ripley message bubble */}
          <div className="bg-orange-500/10 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎙️</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-orange-500">Ripley</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">
                  Here's one. Show me what you've got.
                </p>
              </div>
            </div>
          </div>

          {/* Judges - above prompt, like gameplay */}
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-2 text-center">Your judges:</p>
            <div className="flex justify-center gap-2">
              {judges.map((judge) => (
                <button
                  key={judge.key}
                  onClick={() => setSelectedJudge(judge)}
                  className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors text-slate-200 text-sm"
                >
                  {judge.emoji} {judge.name}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt - Hero style like gameplay */}
          <div className="mb-6 text-center">
            <p className="text-2xl font-bold text-slate-100">{prompt}</p>
          </div>

          {/* Answer input */}
          <div className="mb-6">
            <textarea
              value={answer}
              onChange={handleAnswerChange}
              placeholder="Type your answer..."
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none h-32"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-sm ${wordCount > 30 ? 'text-red-400' : 'text-slate-500'}`}>
                {wordCount}/30 words
              </span>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mb-4">{error}</p>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmitPractice}
            disabled={!answer.trim() || wordCount > 30}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            Send to Judges
          </button>

          <button
            onClick={handleSkip}
            className="w-full py-3 mt-3 bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-600/50 font-medium rounded-xl transition-colors"
          >
            Skip practice
          </button>
        </div>

        {/* Judge Profile Modal */}
        {selectedJudge && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedJudge(null)}
          >
            <div 
              className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{selectedJudge.emoji}</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{selectedJudge.name}</h3>
                </div>
              </div>
              <p className="text-slate-300 mb-4">{selectedJudge.description}</p>
              {selectedJudge.examples && (
                <p className="text-slate-400 text-sm italic">{selectedJudge.examples}</p>
              )}
              <button
                onClick={() => setSelectedJudge(null)}
                className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STEP 3: Results
  if (step === 3 && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          {/* Ripley message bubble */}
          <div className="bg-orange-500/10 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎙️</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-orange-500">Ripley</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {results.ripley_comment || "Not bad for a first swing! Here's what the judges think."}
                </p>
              </div>
            </div>
          </div>

          {/* Prompt - bigger/bold like gameplay */}
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{prompt}</p>
          </div>

          {/* Your answer */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{profile.avatar}</span>
              <span className="font-bold text-slate-100">{profile.name}</span>
            </div>
            <p className="text-slate-200">{answer}</p>
          </div>

          {/* Judge feedback */}
          <div className="space-y-2 mb-8">
            {results.scores?.map((scoreData) => {
              const judge = judges.find(j => j.key === scoreData.judge_key);
              return (
                <div key={scoreData.judge_key} className="bg-slate-800/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{judge?.emoji || '⭐'}</span>
                    <span className="text-sm font-bold text-slate-300">{judge?.name || scoreData.judge_key}:</span>
                    <span className="text-sm text-slate-400">I give your answer a <span className="text-orange-500">{scoreData.score}</span> out of 10</span>
                  </div>
                  <p className="text-sm text-slate-400 italic">{scoreData.tip}</p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            I'm Ready to Play
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}