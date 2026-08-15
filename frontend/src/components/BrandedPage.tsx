import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'

/**
 * Shared centered-content shell with a floating LVAMO badge (linking back to
 * the hub) — used by any vertical's unauthenticated/public pages. Kept
 * independent of Applaut's app-shell Layout so other verticals (Jobref, and
 * beyond) don't need to depend on Applaut-specific routing/layout code.
 */
export default function BrandedPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <Link to="/" title="Back to LVAMO" style={{ position: 'absolute', top: '1.5rem', left: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Logo />
        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>LVAMO</span>
      </Link>
      {children}
    </div>
  )
}
