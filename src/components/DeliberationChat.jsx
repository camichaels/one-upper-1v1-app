import { useState, useEffect } from 'react';

// Quips for the deliberation screen
const DELIBERATION_QUIPS = [
  // Thoughtful
  "Hmm, interesting approach...",
  "I didn't see that coming.",
  "Bold choice.",
  "That's one way to do it.",
  "Let me think about this...",
  "Both have merit.",
  "This is tricky.",
  "I need a moment.",
  "Okay, okay, I see what they did.",
  "Not what I expected.",
  
  // Evaluative
  "Good wordplay.",
  "Points for creativity.",
  "Solid effort.",
  "That landed.",
  "Took a risk there.",
  "Safe but effective.",
  "Clever.",
  "Ooh, that's good.",
  "I respect the commitment.",
  "Going for it, I see.",
  
  // Snarky
  "Well, that happened.",
  "One of these is definitely wrong.",
  "I've seen worse.",
  "Confident. Maybe too confident.",
  "Interesting strategy...",
  "Did they really go there?",
  "That's a choice.",
  "Okay then.",
  "Sure, why not.",
  "I mean... okay.",
  
  // Meta/Ripley
  "Where's my coffee?",
  "This is a tough one.",
  "I love my job.",
  "Don't mind me, just watching.",
  "The tension!",
  "Who's got popcorn?",
  "This is why I host.",
  "Can't wait to announce this.",
  "Drama!",
  "The suspense is killing me.",
];

export default function DeliberationChat({ judgeProfiles }) {
  // Generate all possible messages on mount
  const [messages] = useState(() => {
    const allSpeakers = [
      ...judgeProfiles.map(j => ({ emoji: j.emoji, name: j.name })),
      { emoji: '🎙️', name: 'Ripley' }
    ];
    
    // Shuffle quips
    const shuffled = [...DELIBERATION_QUIPS].sort(() => Math.random() - 0.5);
    
    return shuffled.map((quip, i) => ({
      id: i,
      speaker: allSpeakers[Math.floor(Math.random() * allSpeakers.length)],
      text: quip,
    }));
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Cycle through messages with flip animation
  useEffect(() => {
    const cycleMessage = () => {
      setIsFlipping(true);
      
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % messages.length);
        setIsFlipping(false);
      }, 300);
    };
    
    const timer = setInterval(cycleMessage, 3000);
    return () => clearInterval(timer);
  }, [messages.length]);

  const currentMessage = messages[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[50vh]">
      {/* Label */}
      <p className="text-slate-500 text-sm mb-4 italic">Meanwhile...</p>
      
      {/* Bubble with flip animation */}
      <div
        className={`transition-all duration-300 ${isFlipping ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
      >
        <div className="bg-slate-800/70 rounded-2xl px-5 py-4 border border-slate-700/50 max-w-xs">
          {/* Icon + Name row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{currentMessage?.speaker.emoji}</span>
            <span className="text-orange-400 text-sm font-medium">{currentMessage?.speaker.name}</span>
          </div>
          {/* Comment */}
          <p className="text-slate-200">{currentMessage?.text}</p>
        </div>
      </div>
    </div>
  );
}