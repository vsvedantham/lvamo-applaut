import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import BrandedPage from '../../components/BrandedPage'

export default function Jobref() {
  useDocumentTitle('Jobref — coming soon | LVAMO')
  return (
    <BrandedPage>
      <div style={{ textAlign: 'center', maxWidth: '560px' }}>
        <div style={{
          display: 'inline-block',
          padding: '0.3rem 0.8rem',
          background: 'var(--warn-bg)',
          border: '1px solid var(--warn-border)',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--warn)',
          letterSpacing: '0.04em',
          marginBottom: '1.75rem',
        }}>
          Job Referral Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: '1.25rem',
          color: 'var(--text-1)',
        }}>
          Jobref is coming soon
        </h1>

        <p style={{ fontSize: '1.0625rem', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '2.25rem', maxWidth: '440px', margin: '0 auto 2.25rem' }}>
          We're building a way to connect job seekers with employees willing to
          refer them at their company — something good is on the way. Check
          back soon.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              padding: '0.7rem 1.75rem',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Back to LVAMO
          </Link>
          <Link
            to="/applaut"
            style={{
              padding: '0.7rem 1.75rem',
              background: 'transparent',
              color: 'var(--text-1)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
          >
            Try Applaut instead
          </Link>
        </div>
      </div>
    </BrandedPage>
  )
}
