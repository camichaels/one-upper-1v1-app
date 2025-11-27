// AuthCallback.jsx
// Handles magic link verification: /auth/:token
// Place in src/components/AuthCallback.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

export default function AuthCallback() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'select_profile' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setStatus('error');
        setErrorMessage('No token provided');
        return;
      }

      // Clear any existing profile selection so user sees picker for multiple profiles
      localStorage.removeItem('activeProfileId');

      try {
        // Look up the token
        const { data: authToken, error: fetchError } = await supabase
          .from('auth_tokens')
          .select('*')
          .eq('token', token)
          .single();

        if (fetchError || !authToken) {
          setStatus('error');
          setErrorMessage('Invalid or expired link. Please request a new one.');
          return;
        }

        // Check if expired
        if (new Date(authToken.expires_at) < new Date()) {
          setStatus('error');
          setErrorMessage('This link has expired. Please request a new one.');
          return;
        }

        // Check if already used
        if (authToken.used_at) {
          setStatus('error');
          setErrorMessage('This link has already been used. Please request a new one.');
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
          phone: authToken.phone,
          verifiedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
        localStorage.setItem('authSession', JSON.stringify(session));

        // Fetch profiles for this phone
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', authToken.phone);

        if (profilesError) {
          throw profilesError;
        }

console.log('Profiles found:', profilesData?.length, profilesData); 

        if (!profilesData || profilesData.length === 0) {
          setStatus('error');
          setErrorMessage('No profiles found for this phone number.');
          return;
        }

        // Save all profiles to history
        profilesData.forEach(p => saveProfileToHistory(p));

        if (profilesData.length === 1) {
          // Single profile - auto-login
          localStorage.setItem('activeProfileId', profilesData[0].id);
          setStatus('success');
          setTimeout(() => {
            navigate('/play', { replace: true });
          }, 1000);
        } else {
          // Multiple profiles - show picker
          const sortedProfiles = [...profilesData].sort((a, b) => a.name.localeCompare(b.name));
          setProfiles(sortedProfiles);
          setStatus('select_profile');
        }

      } catch (err) {
        console.error('Error verifying token:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    }

    verifyToken();
  }, [token, navigate]);

  function handleSelectProfile(profile) {
    localStorage.setItem('activeProfileId', profile.id);
    navigate('/play', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {status === 'verifying' && (
          <>
            <div className="text-4xl mb-4">🔐</div>
            <h1 className="text-xl font-bold text-white mb-2">Verifying...</h1>
            <p className="text-slate-400">Please wait</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-white mb-2">Verified!</h1>
            <p className="text-slate-400">Taking you to your game...</p>
          </>
        )}

        {status === 'select_profile' && (
          <>
            <h1 className="text-2xl font-bold text-orange-500 mb-6">Select Your Profile</h1>
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
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-slate-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-400"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}