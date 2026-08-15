export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="rgba(129,140,248,0.12)" />
      <path d="M8 25L16 7l8 18" fill="none" stroke="url(#logo-g)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.4 19.5h11.2" stroke="url(#logo-g)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
