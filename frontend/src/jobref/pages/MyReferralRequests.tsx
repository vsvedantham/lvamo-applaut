import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { listMyReferralRequests, type ReferralRequestItem } from '../api/referralRequests'
import { STATUS_COLOR, STATUS_LABEL } from '../constants'

// A seeker's view of everything they've sent — symmetric to the
// employee's inbox (Dashboard.tsx's "Referral requests" section /
// ReferralRequestDetail.tsx), but read-only: nothing here changes
// status, it just reports what the employee decided.
export default function JobrefMyReferralRequests() {
  useDocumentTitle('My referral requests | Jobref')

  const [requests, setRequests] = useState<ReferralRequestItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMyReferralRequests()
      .then((data) => {
        if (!cancelled) setRequests(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '900px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          My referral requests
        </h1>

        {error && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
            Couldn't load your requests right now — try refreshing the page.
          </p>
        )}
        {!error && requests === null && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading…</p>
        )}
        {requests && requests.length === 0 && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
            You haven't sent any referral requests yet — pick a company from your dashboard to get started.
          </p>
        )}
        {requests && requests.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {requests.map((r) => {
              const color = STATUS_COLOR[r.status]
              return (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)' }}>
                      {r.company_name}
                    </div>
                    <div style={{
                      flexShrink: 0, padding: '0.25rem 0.65rem', background: color.bg,
                      border: `1px solid ${color.border}`, borderRadius: '999px', fontSize: '0.7rem',
                      fontWeight: 600, color: color.fg, whiteSpace: 'nowrap',
                    }}>
                      {STATUS_LABEL[r.status]}
                    </div>
                  </div>

                  <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </div>

                  <p style={{ color: 'var(--text-2)', fontSize: '0.83rem', margin: 0, fontStyle: 'italic' }}>
                    "{r.message}"
                  </p>

                  {r.status === 'accepted' && (
                    <div style={{ padding: '0.6rem 0.75rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-xs)' }}>
                      <p style={{ color: 'var(--success)', fontSize: '0.8rem', margin: 0 }}>
                        Accepted and sent for referral!
                      </p>
                    </div>
                  )}
                  {r.status === 'rejected' && (
                    <div style={{ padding: '0.6rem 0.75rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)' }}>
                      <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>
                        {r.rejection_reason}
                      </p>
                    </div>
                  )}

                  <a href={r.job_link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.78rem' }}>
                    Job posting ↗
                  </a>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/jobref/dashboard" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>← Back to dashboard</Link>
        </p>
      </div>
    </BrandedPage>
  )
}
