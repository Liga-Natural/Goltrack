export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#1a1a1a" />
      <path
        d="M8 22.5 L14 12 L26 12 L32 22.5 L26 31 L14 31 Z"
        fill="none"
        stroke="#e63946"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M14 12 L20 20 L26 12" stroke="#e63946" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M8 22.5 L20 20 L14 31" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35" />
      <path d="M32 22.5 L20 20 L26 31" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35" />
      <circle cx="20" cy="20" r="2.4" fill="#e63946" />
    </svg>
  );
}

export function Logo({ className = "", markClassName = "h-8 w-8" }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display tracking-tight ${className}`}>
      <LogoMark className={markClassName} />
      <span>
        Gol<span className="text-pitch-600">Track</span>
      </span>
    </span>
  );
}
