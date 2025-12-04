import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Category options (same as Screen1)
const PROMPT_CATEGORIES = [
  { key: 'mixed', label: 'Surprise Me', emoji: '🔀' },
  { key: 'pop_culture', label: 'Pop Culture', emoji: '🌟' },
  { key: 'deep_think', label: 'Deep Think', emoji: '🤔' },
  { key: 'edgy', label: 'More Edgy', emoji: '🌶️' },
  { key: 'absurd', label: 'Totally Absurd', emoji: '😂' },
  { key: 'everyday', label: 'Everyday', emoji: '☕' },
];

// Generate a random 4-character invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function RematchModal({ 
  isOpen, 
  onClose, 
  myProfile, 
  opponent 
}) {
  const [selectedCategory, setSelectedCategory] = useState('mixed');
  const [stakes, setStakes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function handleShareViaText() {
    const message = `Want a rematch? Join with code ${inviteCode} at oneupper.app/join/${inviteCode}`;
    const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  }

  async function handleSendRematch() {
    setIsSending(true);
    setError('');

    try {
      // Generate invite code
      const code = generateInviteCode();

      // Create the invite
      const { data: invite, error: inviteError } = await supabase
        .from('rivalry_invites')
        .insert({
          code: code,
          creator_profile_id: myProfile.id,
          stakes: stakes.trim() || null,
          prompt_category: selectedCategory
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      setInviteCode(code);

      // Try to send SMS if opponent has consent
      if (opponent.phone && opponent.sms_consent) {
        try {
          const smsResponse = await supabase.functions.invoke('send-sms', {
            body: {
              userId: opponent.id,
              notificationType: 'rematch_challenge',
              contextData: {
                challenger_name: myProfile.name,
                invite_code: code,
                stakes: stakes.trim() || null
              }
            }
          });
          
          if (smsResponse.data?.success) {
            setSmsSent(true);
          }
        } catch (smsError) {
          console.error('Failed to send rematch SMS:', smsError);
          // Don't fail the whole flow if SMS fails
        }
      }

      setSent(true);
    } catch (err) {
      console.error('Failed to create rematch invite:', err);
      setError('Failed to send rematch. Try again.');
    } finally {
      setIsSending(false);
    }
  }

  function handleClose(wasSent = false) {
    // Reset state on close
    setSelectedCategory('mixed');
    setStakes('');
    setSent(false);
    setError('');
    setInviteCode('');
    setSmsSent(false);
    setCopied(false);
    onClose(wasSent);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
        
        {sent ? (
          /* Success State - Different based on SMS status */
          smsSent ? (
            /* SMS was sent - simple confirmation */
            <div className="text-center">
              <h3 className="text-xl font-bold text-orange-400 mb-3">
                Rematch Created!
              </h3>
              <p className="text-slate-300 mb-6">
                We sent a game message to {opponent.name}.
              </p>
              <button
                onClick={() => handleClose(true)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* No SMS - show code like main flow */
            <div className="text-center">
              <h3 className="text-xl font-bold text-orange-400 mb-3">
                Rematch Created!
              </h3>
              <p className="text-slate-300 mb-3">
                {opponent.name} doesn't have game messaging on. Share this code:
              </p>
              
              {/* Big code display */}
              <p className="text-4xl font-bold text-orange-400 tracking-wider mb-2">
                {inviteCode}
              </p>
              <p className="text-slate-500 text-sm mb-5">
                Expires in 24 hours
              </p>

              {/* Copy and Share buttons */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy Code'}
                </button>
                <button
                  onClick={handleShareViaText}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-colors"
                >
                  Share via Text
                </button>
              </div>

              <button
                onClick={() => handleClose(true)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )
        ) : (
          /* Setup State */
          <>
            <h3 className="text-xl font-bold text-slate-100 mb-5">
              Ask {opponent.name} for a rematch
            </h3>

            {/* Category Picker */}
            <div className="mb-5">
              <label className="text-slate-400 text-sm block mb-2">Category:</label>
              <div className="flex flex-wrap gap-2">
                {PROMPT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === cat.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stakes Input */}
            <div className="mb-6">
              <label className="text-slate-400 text-sm block mb-2">
                Up the stakes (optional):
              </label>
              <input
                type="text"
                value={stakes}
                onChange={(e) => setStakes(e.target.value)}
                placeholder="bragging rights? a burrito?"
                maxLength={100}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRematch}
                disabled={isSending}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                {isSending ? 'Sending...' : 'Send It'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}