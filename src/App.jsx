import { useState } from 'react';
import Screen1 from './components/Screen1';
import Screen2 from './components/Screen2';
import Screen4 from './components/Screen4';
import Screen6 from './components/Screen6';

function App() {
  const [currentScreen, setCurrentScreen] = useState('screen1');
  const [editProfileId, setEditProfileId] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [rivalryId, setRivalryId] = useState(null);
  const [showId, setShowId] = useState(null);

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