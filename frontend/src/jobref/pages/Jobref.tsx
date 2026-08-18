import { Link, Navigate } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import BrandedPage from '../../components/BrandedPage'
import { useJobrefAuth } from '../context/AuthContext'

export default function Jobref() {
  useDocumentTitle('Jobref — get referred | LVAMO')
  const { user, loading } = useJobrefAuth()

  // An existing session should persist across a trip back through the
  // LVAMO hub — landing here already logged in shouldn't re-show
  // Get started/Sign in, it should just continue to the dashboard.
  if (loading) return null
  if (user) return <Navigate to="/jobref/dashboard" replace />

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
          Get referred. Get hired.
        </h1>

        <p style={{ fontSize: '1.0625rem', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '2.25rem', maxWidth: '440px', margin: '0 auto 2.25rem' }}>
          Jobref connects job seekers with employees willing to refer them at
          their company. Sign up as an employee to refer candidates, or as a
          job seeker to get referred.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/jobref/register"
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
            Get started
          </Link>
          <Link
            to="/jobref/login"
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
            Sign in
          </Link>
        </div>

        <p style={{ marginTop: '1.75rem' }}>
          <Link to="/" style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Back to LVAMO</Link>
        </p>
      </div>
    </BrandedPage>
  )
}
