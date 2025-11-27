// AuthCallback.jsx
// Handles magic link verification: /auth/:token
// Place in src/components/AuthCallback.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setStatus('error');
        setErrorMessage('No token provided');
        return;
      }

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

        setStatus('success');

        // Redirect to profile picker after brief delay
        setTimeout(() => {
          navigate('/play', { replace: true });
        }, 1000);

      } catch (err) {
        console.error('Error verifying token:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    }

    verifyToken();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center">
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
            <p className="text-slate-400">Taking you to your profiles...</p>
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