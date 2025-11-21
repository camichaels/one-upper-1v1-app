import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from './Header';

export default function JoinRivalry() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'has_profile' | 'needs_profile' | 'already_in_rivalry' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkUserStatus();
  }, [code]);

  async function checkUserStatus() {
    try {
      // First, look up the friend's profile by code
      const { data: friendProfile, error: friendError } = await supabase
        .from('profiles')
        .select('name, id')
        .eq('code', code.toUpperCase())
        .single();

      if (friendError || !friendProfile) {
        setStatus('error');
        setErrorMessage('Invalid invite code. Check with your friend!');
        return;
      }

      // Check if user has an active profile
      const activeId = localStorage.getItem('activeProfileId');
      
      if (!activeId) {
        // No profile - need to create one first
        setStatus('needs_profile');
        // Store the code and friend's name for later
        sessionStorage.setItem('pendingRivalryCode', code.toUpperCase());
        sessionStorage.setItem('pendingRivalryFriendName', friendProfile.name);
        sessionStorage.setItem('pendingRivalryFriendId', friendProfile.id);
        navigate('/play');
        return;
      }

      // Check if trying to join your own code
      if (activeId === friendProfile.id) {
        setStatus('error');
        setErrorMessage("You can't start a rivalry with yourself!");
        return;
      }

      // Load user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeId)
        .single();

      if (profileError || !profile) {
        setStatus('error');
        setErrorMessage('Could not load your profile');
        return;
      }

      // Check if user is already in a rivalry
      const { data: existingRivalry } = await supabase
        .from('rivalries')
        .select('id')
        .or(`profile_a_id.eq.${activeId},profile_b_id.eq.${activeId}`)
        .eq('status', 'active')
        .maybeSingle();

      if (existingRivalry) {
        setStatus('already_in_rivalry');
        return;
      }

      // Check if friend is already in a rivalry
      const { data: friendRivalry } = await supabase
        .from('rivalries')
        .select('id')
        .or(`profile_a_id.eq.${friendProfile.id},profile_b_id.eq.${friendProfile.id}`)
        .eq('status', 'active')
        .maybeSingle();

      if (friendRivalry) {
        setStatus('error');
        setErrorMessage(`${friendProfile.name} is already in a rivalry. Try again later!`);
        return;
      }

      // User has profile and not in rivalry - redirect to /play with prefilled code
      setStatus('has_profile');
      sessionStorage.setItem('pendingRivalryCode', code.toUpperCase());
      sessionStorage.setItem('pendingRivalryFriendName', friendProfile.name);
      sessionStorage.setItem('pendingRivalryFriendId', friendProfile.id);
      navigate('/play');
      
    } catch (err) {
      console.error('Error checking user status:', err);
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  }

  // Loading state
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Already in rivalry error
  if (status === 'already_in_rivalry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto text-center mt-12">
          <div className="text-6xl mb-4">😅</div>
          <h2 className="text-2xl font-bold text-orange-500 mb-4">Already in a Rivalry</h2>
          <p className="text-slate-300 mb-8">
            You're already in an active rivalry. Finish or cancel your current rivalry before joining a new one!
          </p>
          <button
            onClick={() => navigate('/play')}
            className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto text-center mt-12">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-orange-500 mb-4">Oops!</h2>
          <p className="text-slate-300 mb-8">{errorMessage}</p>
          <button
            onClick={() => navigate('/play')}
            className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  // Default fallback (shouldn't reach here due to redirects)
  return null;
}