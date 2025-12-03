import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Screen1 from './components/Screen1';
import Screen2 from './components/Screen2';
import GameplayScreen from './components/GameplayScreen';
import Screen6 from './components/Screen6';
import Screen6Summary from './components/Screen6Summary';
import RivalrySummaryScreen from './components/RivalrySummaryScreen';
import PastRivalriesList from './components/PastRivalriesList';
import JoinRivalry from './components/JoinRivalry';
import VerifyPhone from './components/VerifyPhone';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import JudgesPage from './components/JudgesPage';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import useOnlineStatus from './hooks/useOnlineStatus';


function App() {
  const [editProfileId, setEditProfileId] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [rivalryId, setRivalryId] = useState(null);
  const [showId, setShowId] = useState(null);
  const [verdictStep, setVerdictStep] = useState(1); // Preserved across navigation
  
  const isOnline = useOnlineStatus();

  return (
    <ErrorBoundary>
      {!isOnline && <OfflineBanner />}
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Deep Link for joining rivalry */}
        <Route path="/join/:code" element={<JoinRivalry />} />
        
        {/* Legal Pages */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        
        {/* Judges Page */}
        <Route path="/judges" element={<JudgesPage />} />
        
        {/* Phone Verification */}
        <Route path="/verify" element={<VerifyPhone />} />
        
        {/* Game Routes */}
        <Route 
          path="/play" 
          element={
            <GameRouter
              editProfileId={editProfileId}
              setEditProfileId={setEditProfileId}
              activeProfileId={activeProfileId}
              setActiveProfileId={setActiveProfileId}
              rivalryId={rivalryId}
              setRivalryId={setRivalryId}
              showId={showId}
              setShowId={setShowId}
              verdictStep={verdictStep}
              setVerdictStep={setVerdictStep}
            />
          } 
        />
      </Routes>
    </ErrorBoundary>
  );
}

// Internal game router component
function GameRouter({
  editProfileId,
  setEditProfileId,
  activeProfileId,
  setActiveProfileId,
  rivalryId,
  setRivalryId,
  showId,
  setShowId,
  verdictStep,
  setVerdictStep
}) {
  const [currentScreen, setCurrentScreen] = useState('screen1');
  const [navigationContext, setNavigationContext] = useState(null); // 'from_history' | 'from_gameplay' | null
  const [returnProfileId, setReturnProfileId] = useState(null); // For returning to past rivalries list

  function handleNavigate(screenName, params = {}) {
    setCurrentScreen(screenName);
    
    if (params.editProfileId) {
      setEditProfileId(params.editProfileId);
    } else {
      setEditProfileId(null);
    }

    if (params.activeProfileId) {
      setActiveProfileId(params.activeProfileId);
    }

    if (params.rivalryId) {
      setRivalryId(params.rivalryId);
    }

    if (params.showId) {
      setShowId(params.showId);
    } else {
      setShowId(null);
    }

    // Handle navigation context for back button behavior
    if (params.context) {
      setNavigationContext(params.context);
    } else if (screenName === 'screen1' || screenName === 'screen2') {
      // Reset context when going to main screens
      setNavigationContext(null);
    }

    // Track which profile to return to for past rivalries
    if (params.returnProfileId) {
      setReturnProfileId(params.returnProfileId);
    }

    // Track profileId for pastRivalries screen
    if (params.profileId) {
      setReturnProfileId(params.profileId);
    }
  }

  if (currentScreen === 'screen2') {
    return <Screen2 onNavigate={handleNavigate} editProfileId={editProfileId} />;
  }

  if (currentScreen === 'pastRivalries') {
    return (
      <PastRivalriesList 
        onNavigate={handleNavigate} 
        profileId={returnProfileId}
      />
    );
  }

  // Use GameplayScreen for gameplay
  if (currentScreen === 'gameplay' || currentScreen === 'screen4') {
    return (
      <GameplayScreen 
        onNavigate={handleNavigate} 
        activeProfileId={activeProfileId}
        rivalryId={rivalryId}
        verdictStep={verdictStep}
        setVerdictStep={setVerdictStep}
      />
    );
  }

  if (currentScreen === 'screen6') {
    return <Screen6 onNavigate={handleNavigate} showId={showId} />;
  }

  if (currentScreen === 'screen6summary') {
    return (
      <Screen6Summary 
        onNavigate={handleNavigate} 
        showId={showId}
        rivalryId={rivalryId}
        context={navigationContext}
        returnProfileId={returnProfileId}
      />
    );
  }

  if (currentScreen === 'summary') {
    return (
      <RivalrySummaryScreen 
        onNavigate={handleNavigate}
        activeProfileId={activeProfileId}
        rivalryId={rivalryId}
        context={navigationContext}
        returnProfileId={returnProfileId}
      />
    );
  }

  return <Screen1 onNavigate={handleNavigate} />;
}

export default App;