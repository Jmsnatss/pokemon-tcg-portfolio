export function Pokeball({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#f4f5f9" stroke="#0a0c14" strokeWidth="3" />
      <path d="M2 24a22 22 0 0 1 44 0z" fill="#ef4444" stroke="#0a0c14" strokeWidth="3" />
      <path d="M2 24h44" stroke="#0a0c14" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" fill="#f4f5f9" stroke="#0a0c14" strokeWidth="3" />
      <circle cx="24" cy="24" r="3" fill="#0a0c14" opacity="0.15" />
    </svg>
  )
}
