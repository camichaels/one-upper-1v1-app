// VerifyPhone.jsx
// Manual verification screen: /verify
// Place in src/components/VerifyPhone.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';

// Helper: Save profile to localStorage history
function saveProfileToHistory(profile) {
  const recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
  const profileInfo = {
    id: profile.id,
    name: profile.name,
    code: profile.code,
    avatar: profile.avatar
  };
  
  const updated = [profileInfo, ...recentProfiles.filter(p => p.id !== profile.id)];
  localStorage.setItem('recentProfiles', JSON.stringify(updated.slice(0, 10)));
}

export default function VerifyPhone() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [showProfilePicker, setShowProfilePicker] = useState(false);

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

      // Clear any existing profile selection so user sees picker for multiple profiles
      localStorage.removeItem('activeProfileId');

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

      // Fetch profiles for this phone
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalizedPhone);

      if (profilesError) {
        throw profilesError;
      }

      if (!profilesData || profilesData.length === 0) {
        setError('No profiles found for this phone number.');
        setIsVerifying(false);
        return;
      }

      // Save all profiles to history
      profilesData.forEach(p => saveProfileToHistory(p));

      if (profilesData.length === 1) {
        // Single profile - auto-login
        localStorage.setItem('activeProfileId', profilesData[0].id);
        navigate('/play', { replace: true });
      } else {
        // Multiple profiles - show picker
        const sortedProfiles = [...profilesData].sort((a, b) => a.name.localeCompare(b.name));
        setProfiles(sortedProfiles);
        setShowProfilePicker(true);
        setIsVerifying(false);
      }

    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Something went wrong. Please try again.');
      setIsVerifying(false);
    }
  }

  function handleSelectProfile(profile) {
    localStorage.setItem('activeProfileId', profile.id);
    navigate('/play', { replace: true });
  }

  // Show profile picker if multiple profiles
  if (showProfilePicker) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-orange-500 mb-2">ONE-UPPER 🎤</h1>
            <p className="text-slate-300">Select your profile</p>
          </div>

          <div className="space-y-3">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSelectProfile(profile)}
                className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{profile.avatar}</span>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-slate-100">
                      {profile.name}
                    </div>
                    <div className="text-sm text-orange-500 font-medium">
                      Code: {profile.code}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
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