import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useJobrefAuth } from '../context/AuthContext'
import { submitReferralRequest } from '../api/referralRequests'

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)' }
const MESSAGE_MAX = 150

// Reached by clicking a company tile on the seeker dashboard — see
// Dashboard.tsx, which links here with ?company=&careers_url= for the
// tile clicked. No stable per-company id exists yet (jobref.companies has
// one row per employee, not deduplicated — see models/jobref_company.py),
// so the company is identified by these two query params, matching what
// the dashboard's grouped /companies listing already returns.
export default function JobrefReferralRequest() {
  useDocumentTitle('Request a referral | Jobref')
  const { user } = useJobrefAuth()
  const [params] = useSearchParams()
  const companyName = params.get('company') ?? ''
  const careersUrl = params.get('careers_url') ?? ''

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [jobLink, setJobLink] = useState('')
  const [cvDriveLink, setCvDriveLink] = useState('')
  const [coverLetterDriveLink, setCoverLetterDriveLink] = useState('')
  const [message, setMessage] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const formValid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    jobLink.trim() !== '' &&
    cvDriveLink.trim() !== '' &&
    coverLetterDriveLink.trim() !== '' &&
    message.trim() !== '' &&
    message.length <= MESSAGE_MAX

  if (!companyName || !careersUrl) {
    return (
      <BrandedPage>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              No company selected — please pick one from your dashboard.
            </p>
            <Link to="/jobref/dashboard" style={{ color: 'var(--accent)', fontWeight: 600 }}>Back to dashboard</Link>
          </div>
        </div>
      </BrandedPage>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await submitReferralRequest({
        company_name: companyName,
        company_careers_url: careersUrl,
        first_name: firstName,
        last_name: lastName,
        job_link: jobLink,
        cv_drive_link: cvDriveLink,
        cover_letter_drive_link: coverLetterDriveLink,
        message,
      })
      setSubmitted(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join(' ')
          : detail ?? 'Something went wrong — please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <BrandedPage>
        <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px',
              borderRadius: '50%', background: 'var(--success-bg)', border: '1px solid var(--success-border)', marginBottom: '1rem',
            }}>
              <span style={{ color: 'var(--success)', fontSize: '1.4rem' }}>✓</span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Request sent</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Your referral request for <strong>{companyName}</strong> is in. We'll let you know once someone there follows up.
            </p>
            <Link to="/jobref/dashboard" style={{ color: 'var(--accent)', fontWeight: 600 }}>Back to dashboard</Link>
          </div>
        </div>
      </BrandedPage>
    )
  }

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Request a referral at {companyName}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            A few steps, then submit the details below
          </p>
        </div>

        <ol style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '1.25rem 1.25rem 1.25rem 2.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
          fontSize: '0.85rem', color: 'var(--text-1)',
        }}>
          <li>
            Visit the{' '}
            <a href={careersUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              careers page ↗
            </a>
          </li>
          <li>Find a job posting that matches your experience and skills</li>
          <li>Tailor your CV and cover letter for that role</li>
          <li>Fill in the details below</li>
        </ol>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem' }}>
          {error && (
            <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <label style={labelStyle}>Job posting link</label>
              <input type="url" value={jobLink} onChange={e => setJobLink(e.target.value)} required placeholder="https://.../careers/job-id" />
            </div>

            <div style={field}>
              <label style={labelStyle}>
                CV{' '}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(Google Drive link)</span>
              </label>
              <input type="url" value={cvDriveLink} onChange={e => setCvDriveLink(e.target.value)} required placeholder="https://drive.google.com/file/d/..." />
            </div>

            <div style={field}>
              <label style={labelStyle}>
                Cover letter{' '}<span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(Google Drive link)</span>
              </label>
              <input type="url" value={coverLetterDriveLink} onChange={e => setCoverLetterDriveLink(e.target.value)} required placeholder="https://drive.google.com/file/d/..." />
            </div>

            <div style={field}>
              <label style={labelStyle}>Message to the referrer</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                required
                rows={3}
                placeholder="A short note about why you're a good fit…"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', alignSelf: 'flex-end' }}>
                {message.length}/{MESSAGE_MAX}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !formValid}
              style={{
                marginTop: '0.25rem', padding: '0.625rem', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.9rem',
                opacity: loading || !formValid ? 0.5 : 1,
                cursor: loading || !formValid ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending…' : 'Send referral request'}
            </button>
          </form>
        </div>

        <p style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <Link to="/jobref/dashboard" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>← Back to dashboard</Link>
        </p>
      </div>
    </BrandedPage>
  )
}
