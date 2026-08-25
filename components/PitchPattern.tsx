export function PitchPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <rect x="20" y="20" width="360" height="360" rx="14" />
      <line x1="20" y1="200" x2="380" y2="200" />
      <circle cx="200" cy="200" r="55" />
      <circle cx="200" cy="200" r="2.5" fill="currentColor" stroke="none" />
      <rect x="20" y="120" width="70" height="160" />
      <rect x="20" y="160" width="26" height="80" />
      <rect x="310" y="120" width="70" height="160" />
      <rect x="354" y="160" width="26" height="80" />
    </svg>
  );
}
