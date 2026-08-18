import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useJobrefAuth } from '../context/AuthContext'
import { getLinkedInPrefill } from '../api/auth'
import type { JobSeekerStatus, LinkedInPrefill, ReferFrequency, RegisterPayload, UserType } from '../api/auth'

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)' }
const sectionLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--text-3)', marginTop: '0.5rem', marginBottom: '-0.25rem',
}

const typeCard = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '0.85rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-strong)'}`,
  background: active ? 'var(--accent-glow)' : 'transparent',
  cursor: 'pointer',
  textAlign: 'center',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: active ? 'var(--accent)' : 'var(--text-2)',
  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
})

export default function JobrefRegisterComplete() {
  useDocumentTitle('Complete registration | Jobref')
  const { register } = useJobrefAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [prefill, setPrefill] = useState<LinkedInPrefill | null>(null)
  const [prefillError, setPrefillError] = useState('')

  // Shared fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [domain, setDomain] = useState('')
  const [userType, setUserType] = useState<UserType>('employee')

  // Employee fields
  const [companyName, setCompanyName] = useState('')
  const [workingSince, setWorkingSince] = useState('')
  const [canRefer, setCanRefer] = useState(false)
  const [referFrequency, setReferFrequency] = useState<ReferFrequency>('monthly')
  const [referCount, setReferCount] = useState('')
  const [companyCareersUrl, setCompanyCareersUrl] = useState('')

  // Job seeker fields
  const [jobStatus, setJobStatus] = useState<JobSeekerStatus>('none')
  const [noticeJoinDate, setNoticeJoinDate] = useState('')
  const [cvDriveLink, setCvDriveLink] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setPrefillError('Missing LinkedIn sign-in — please start over.')
      return
    }
    getLinkedInPrefill(token)
      .then(p => {
        setPrefill(p)
        setFirstName(p.first_name)
        setLastName(p.last_name)
      })
      .catch(() => setPrefillError('Your LinkedIn sign-in has expired. Please start over.'))
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const payload: RegisterPayload = {
      registration_token: token,
      first_name: firstName,
      last_name: lastName,
      phone,
      password,
      domain,
      user_type: userType,
    }

    if (userType === 'employee') {
      payload.employee = {
        company_name: companyName,
        working_since: workingSince,
        can_refer: canRefer,
        refer_frequency: canRefer ? referFrequency : null,
        refer_count: canRefer ? Number(referCount) : null,
        company_careers_url: companyCareersUrl,
      }
    } else {
      payload.seeker = {
        current_job_status: jobStatus,
        notice_join_date: jobStatus === 'serving_notice' ? noticeJoinDate : null,
        cv_drive_link: cvDriveLink,
      }
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

  if (prefillError) {
    return (
      <BrandedPage>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{prefillError}</p>
            <Link to="/jobref/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Start over</Link>
          </div>
        </div>
      </BrandedPage>
    )
  }

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>Almost there</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>A few more details to finish creating your account</p>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
          {error && (
            <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0 }}>{error}</p>
            </div>
          )}

          {!prefill ? (
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Loading your LinkedIn details…</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.6rem 0.75rem', background: 'var(--accent-glow)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-xs)', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                Signed in via LinkedIn as <strong>{prefill.email}</strong>
                {prefill.email_verified && ' (verified)'}
              </div>

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
                <label style={labelStyle}>Email <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(from LinkedIn)</span></label>
                <input type="email" value={prefill.email} disabled style={{ opacity: 0.65 }} />
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

              <div style={sectionLabel}>I am a</div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <div style={typeCard(userType === 'employee')} onClick={() => setUserType('employee')}>
                  Full-time employee
                </div>
                <div style={typeCard(userType === 'job_seeker')} onClick={() => setUserType('job_seeker')}>
                  Job seeker
                </div>
              </div>

              {userType === 'employee' ? (
                <>
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
                </>
              ) : (
                <>
                  <div style={field}>
                    <label style={labelStyle}>Current job status</label>
                    <select value={jobStatus} onChange={e => setJobStatus(e.target.value as JobSeekerStatus)}>
                      <option value="none">Not currently employed</option>
                      <option value="part_time">Part-time</option>
                      <option value="mini_job">Mini-job</option>
                      <option value="serving_notice">Serving notice period</option>
                    </select>
                  </div>

                  {jobStatus === 'serving_notice' && (
                    <div style={field}>
                      <label style={labelStyle}>Available to join from</label>
                      <input type="date" value={noticeJoinDate} onChange={e => setNoticeJoinDate(e.target.value)} required />
                    </div>
                  )}

                  <div style={field}>
                    <label style={labelStyle}>
                      CV Google Drive link{' '}
                      <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>("Anyone with the link" access)</span>
                    </label>
                    <input type="url" value={cvDriveLink} onChange={e => setCvDriveLink(e.target.value)} required placeholder="https://drive.google.com/file/d/..." />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ marginTop: '0.25rem', padding: '0.625rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.9rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </BrandedPage>
  )
}
