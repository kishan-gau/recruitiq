export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-screen ${className}`}>
      <div className="w-16 h-16 spinner" aria-label="Loading"></div>
    </div>
  );
}
