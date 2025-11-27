// VerifyPhone.jsx
// Manual verification screen: /verify
// Place in src/components/VerifyPhone.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';

export default function VerifyPhone() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      // Validate phone
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        setError(phoneValidation.error);
        setIsVerifying(false);
        return;
      }

      // Validate code format
      if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        setError('Please enter the 6-digit code from your text');
        setIsVerifying(false);
        return;
      }

      const normalizedPhone = normalizePhone(phone);

      // Look up the token by phone and code
      const { data: authToken, error: fetchError } = await supabase
        .from('auth_tokens')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('code', code)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !authToken) {
        setError('Invalid code. Please check and try again.');
        setIsVerifying(false);
        return;
      }

      // Check if expired
      if (new Date(authToken.expires_at) < new Date()) {
        setError('This code has expired. Please request a new one.');
        setIsVerifying(false);
        return;
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('auth_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', authToken.id);

      if (updateError) {
        console.error('Error marking token as used:', updateError);
      }

      // Store verified session
      const session = {
        phone: normalizedPhone,
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };
      localStorage.setItem('authSession', JSON.stringify(session));

      // Redirect to game
      navigate('/play', { replace: true });

    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Something went wrong. Please try again.');
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-orange-500 mb-2">ONE-UPPER 🎤</h1>
          <p className="text-slate-300">Enter your verification code</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="415-555-1234"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 text-center text-2xl tracking-widest"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-300 text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}