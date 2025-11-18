import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Screen1 from './components/Screen1';
import Screen2 from './components/Screen2';
import Screen4 from './components/Screen4';
import Screen6 from './components/Screen6';

function App() {
  const [editProfileId, setEditProfileId] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [rivalryId, setRivalryId] = useState(null);
  const [showId, setShowId] = useState(null);

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
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
          />
        } 
      />
      
      {/* Deep Link for joining rivalry - BONUS FEATURE FOR LATER */}
      {/* <Route path="/join/:code" element={<Screen1 onNavigate={handleNavigate} />} /> */}
    </Routes>
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
  setShowId
}) {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState('screen1');

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
  }

  if (currentScreen === 'screen2') {
    return <Screen2 onNavigate={handleNavigate} editProfileId={editProfileId} />;
  }

  if (currentScreen === 'screen4') {
    return (
      <Screen4 
        onNavigate={handleNavigate} 
        activeProfileId={activeProfileId}
        rivalryId={rivalryId}
      />
    );
  }

  if (currentScreen === 'screen6') {
    return <Screen6 onNavigate={handleNavigate} showId={showId} />;
  }

  return <Screen1 onNavigate={handleNavigate} />;
}

export default App;