import { useSearchParams, Link } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { linkedInAuthorizeUrl } from '../api/auth'

export default function JobrefRegister() {
  useDocumentTitle('Create account | Jobref')
  const [params] = useSearchParams()
  const linkedinError = params.get('linkedin') === 'error'

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>Create account</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Get referred, or start referring others</p>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
          {linkedinError && (
            <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0 }}>
                LinkedIn sign-in was cancelled or failed. Please try again.
              </p>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Jobref uses LinkedIn to verify your identity and prevent duplicate accounts.
            We only request your <strong>name and email address</strong> from your LinkedIn
            profile to pre-fill your registration — nothing else. We never see your
            connections or messages, and we never post on your behalf.
          </p>

          <a
            href={linkedInAuthorizeUrl()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              padding: '0.7rem', background: '#0A66C2', color: '#fff', borderRadius: 'var(--radius-xs)',
              fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
            }}
          >
            <LinkedInMark />
            Continue with LinkedIn
          </a>
        </div>

        <p style={{ marginTop: '1.25rem', textAlign: 'center', color: 'var(--text-2)', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <Link to="/jobref/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </BrandedPage>
  )
}

function LinkedInMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  )
}
