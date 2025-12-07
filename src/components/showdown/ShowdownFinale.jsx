import { useNavigate } from 'react-router-dom';
import ShowdownChampion from './ShowdownChampion';
import ShowdownHighlights from './ShowdownHighlights';
import { updateFinaleStep } from '../../services/showdown';

export default function ShowdownFinale({ showdown, currentPlayer, isHost }) {
  const navigate = useNavigate();
  
  // Use finale_step from showdown (synced via real-time) or default to 'champion'
  const phase = showdown.finale_step || 'champion';

  async function handleContinueToHighlights() {
    if (!isHost) return;
    try {
      await updateFinaleStep(showdown.id, 'highlights');
    } catch (err) {
      console.error('Failed to advance to highlights:', err);
    }
  }

  // Champion screen - host controlled
  if (phase === 'champion') {
    return (
      <ShowdownChampion
        showdown={showdown}
        currentPlayer={currentPlayer}
        isHost={isHost}
        onContinue={handleContinueToHighlights}
      />
    );
  }

  // Highlights screen - everyone has independent control now
  return (
    <ShowdownHighlights
      showdown={showdown}
      currentPlayer={currentPlayer}
    />
  );
}