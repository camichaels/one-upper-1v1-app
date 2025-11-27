export default function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-50 shadow-lg">
      <span className="text-sm font-medium">
        📡 You're offline. Reconnect to continue playing.
      </span>
    </div>
  );
}