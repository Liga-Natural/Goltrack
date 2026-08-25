// Indoor futsal court markings — deliberately distinct from PitchPattern's
// outdoor goal boxes so soccer and futsal tournaments read as different
// sports at a glance, not just a relabeled template.
export function CourtPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <rect x="20" y="60" width="360" height="280" rx="10" />
      <line x1="200" y1="60" x2="200" y2="340" />
      <circle cx="200" cy="200" r="45" />
      <circle cx="200" cy="200" r="2.5" fill="currentColor" stroke="none" />
      <path d="M20 150 A50 50 0 0 1 20 250" />
      <path d="M380 150 A50 50 0 0 0 380 250" />
      <rect x="20" y="170" width="16" height="60" />
      <rect x="364" y="170" width="16" height="60" />
    </svg>
  );
}
