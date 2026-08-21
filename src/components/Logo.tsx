import { BRAND } from "../lib/config";

// Platzhalter-Logo — durch euer eigenes Markenzeichen ersetzen.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold text-lg ${className}`}>
      <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="12" fill="#0e1120" />
        <circle cx="24" cy="24" r="15" fill="none" stroke="url(#logo-g)" strokeWidth="3" />
        <path
          d="M18 24 L23 29 L31 19"
          fill="none"
          stroke="url(#logo-g)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="logo-g" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-white">{BRAND.name}</span>
    </span>
  );
}
