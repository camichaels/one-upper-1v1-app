import { useNavigate } from 'react-router-dom';

export default function HeaderWithBack({ backTo, backLabel = 'Back' }) {
  const navigate = useNavigate();

  function handleBack() {
    navigate(backTo);
  }

  return (
    <div className="relative flex items-center justify-center py-4">
      {/* Back button - left aligned */}
      <button
        onClick={handleBack}
        className="absolute left-0 text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1"
      >
        ← {backLabel}
      </button>
      
      {/* Logo - centered */}
      <img src="/logo-wide.png" alt="One-Upper" className="h-8" />
    </div>
  );
}