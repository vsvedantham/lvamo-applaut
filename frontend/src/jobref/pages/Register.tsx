import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useJobrefAuth } from '../context/AuthContext'
import { linkedInAuthorizeUrl } from '../api/auth'
import type { EmployeeRegisterPayload, ReferFrequency } from '../api/auth'

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)' }

const column: React.CSSProperties = {
  flex: '1 1 360px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '1.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
}

export default function JobrefRegister() {
  useDocumentTitle('Create account | Jobref')
  const { register } = useJobrefAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const linkedinError = params.get('linkedin') === 'error'

  // Employee form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [domain, setDomain] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [workingSince, setWorkingSince] = useState('')
  const [canRefer, setCanRefer] = useState(false)
  const [referFrequency, setReferFrequency] = useState<ReferFrequency>('monthly')
  const [referCount, setReferCount] = useState('')
  const [companyCareersUrl, setCompanyCareersUrl] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmployeeSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const payload: EmployeeRegisterPayload = {
      user_type: 'employee',
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password,
      domain,
      employee: {
        company_name: companyName,
        working_since: workingSince,
        can_refer: canRefer,
        refer_frequency: canRefer ? referFrequency : null,
        refer_count: canRefer ? Number(referCount) : null,
        company_careers_url: companyCareersUrl,
      },
    }

    setLoading(true)
    try {
      await register(payload)
      navigate('/jobref/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join(' ')
          : detail ?? 'Registration failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '980px' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.35rem' }}>I am a</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Choose how you'd like to join Jobref</p>
        </div>

        {linkedinError && (
          <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0, textAlign: 'center' }}>
              LinkedIn sign-in was cancelled or failed. Please try again.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Left: Full-time Employee — direct registration, no LinkedIn */}
          <div style={column}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem' }}>Full-time Employee</h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>Register directly and start referring candidates at your company</p>
            </div>

            {error && (
              <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)' }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={field}>
                  <label style={labelStyle}>First name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Ada" />
                </div>
                <div style={field}>
                  <label style={labelStyle}>Last name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Lovelace" />
                </div>
              </div>

              <div style={field}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
              </div>

              <div style={field}>
                <label style={labelStyle}>Phone <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(German number)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+49 170 1234567" />
              </div>

              <div style={field}>
                <label style={labelStyle}>Password <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(min. 8 characters)</span></label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" autoComplete="new-password" />
              </div>

              <div style={field}>
                <label style={labelStyle}>Professional field / domain</label>
                <input type="text" value={domain} onChange={e => setDomain(e.target.value)} required placeholder="e.g. Data Engineering" />
              </div>

              <div style={field}>
                <label style={labelStyle}>Company name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme GmbH" />
              </div>
              <div style={field}>
                <label style={labelStyle}>Working since</label>
                <input type="date" value={workingSince} onChange={e => setWorkingSince(e.target.value)} required />
              </div>
              <div style={field}>
                <label style={labelStyle}>Company careers page URL</label>
                <input type="url" value={companyCareersUrl} onChange={e => setCompanyCareersUrl(e.target.value)} required placeholder="https://company.com/careers" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-1)' }}>
                <input type="checkbox" checked={canRefer} onChange={e => setCanRefer(e.target.checked)} />
                I can refer other candidates at my company
              </label>

              {canRefer && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={field}>
                    <label style={labelStyle}>Referral capacity</label>
                    <select value={referFrequency} onChange={e => setReferFrequency(e.target.value as ReferFrequency)}>
                      <option value="weekly">Per week</option>
                      <option value="monthly">Per month</option>
                    </select>
                  </div>
                  <div style={field}>
                    <label style={labelStyle}>How many</label>
                    <input type="number" min={1} value={referCount} onChange={e => setReferCount(e.target.value)} required={canRefer} placeholder="e.g. 2" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ marginTop: '0.25rem', padding: '0.625rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.9rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </div>

          {/* Right: Job Seeker — LinkedIn-gated */}
          <div style={column}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem' }}>Job Seeker</h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>Get discovered by employees willing to refer you</p>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              We use LinkedIn to sign you in. We only take your <strong>name and
              email address</strong> from your LinkedIn profile — nothing else —
              just so you don't end up with more than one account.
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
        </div>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-2)', fontSize: '0.85rem' }}>
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
