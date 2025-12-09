import { useState, useEffect, useRef } from 'react';
import { TOTAL_ROUNDS } from '../../services/showdown';

export default function ShowdownPrompt({ round, showdown, currentPlayer, onSubmit }) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const textareaRef = useRef(null);

  // Word count (rough - split by spaces)
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const maxWords = 30;
  const isOverLimit = wordCount > maxWords;

  // Calculate time remaining from server deadline
  useEffect(() => {
    if (!round.answers_due_at) return;

    const deadline = new Date(round.answers_due_at).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setTimeRemaining(remaining);

      // Auto-submit when timer hits 0
      if (remaining === 0 && !hasAutoSubmitted) {
        setHasAutoSubmitted(true);
        handleSubmit(true);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [round.answers_due_at, hasAutoSubmitted]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  async function handleSubmit(isAuto = false) {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(answer.trim() || (isAuto ? '' : null));
    } catch (err) {
      console.error('Submit error:', err);
      setIsSubmitting(false);
    }
  }

  // Format time as M:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 10;
  const canSubmit = answer.trim().length > 0 && !isOverLimit && !isSubmitting;

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Round indicator - smaller, orange */}
      <div className="text-center mb-3">
        <p className="text-sm font-medium text-orange-400">Round {round.round_number} of {TOTAL_ROUNDS}</p>
      </div>

      {/* Prompt - bold, hero treatment */}
      <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
        {round.prompt_text}
      </p>

      {/* Answer input */}
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Go on, one-up everyone..."
          className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none text-lg"
          rows={4}
          disabled={isSubmitting}
        />
        
        {/* Word count + hint on same line */}
        <div className="flex justify-between items-center mt-2">
          <p className={`text-sm ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}>
            {wordCount}/{maxWords} words
          </p>
          {isOverLimit ? (
            <p className="text-red-400 text-sm">Too many words!</p>
          ) : (
            <p className="text-slate-500 text-sm">Be bold. Be weird. Be unexpected.</p>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className={`text-center mb-6 ${isLowTime ? 'animate-pulse' : ''}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          isLowTime ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-300'
        }`}>
          <span className="text-lg">⏱️</span>
          <span className={`text-2xl font-mono font-bold ${isLowTime ? 'text-red-400' : ''}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={() => handleSubmit(false)}
        disabled={!canSubmit}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
      >
        {isSubmitting ? 'Locking In...' : 'Lock It In'}
      </button>
    </div>
  );
}