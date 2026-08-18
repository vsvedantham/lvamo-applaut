import { useEffect, useState } from 'react'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useJobrefAuth } from '../context/AuthContext'
import { listCompanies, type Company } from '../api/companies'
import {
  listReferralInbox,
  type ReferralInboxItem,
  type ReferralRequestStatus,
} from '../api/referralRequests'
import { Link } from 'react-router-dom'
import ProfilePanel from '../components/ProfilePanel'
import { LogoutIcon, ProfileIcon } from '../components/Icons'

// Only one status exists today — more get added once the employee-side
// action flow (accept/decline/etc.) is built. Keeping this as a lookup
// rather than a raw string makes that later addition a one-line change.
const STATUS_LABEL: Record<ReferralRequestStatus, string> = {
  pending_review: 'Pending review',
}

export default function JobrefDashboard() {
  useDocumentTitle('Dashboard | Jobref')
  const { user, logout } = useJobrefAuth()
  const isEmployee = user?.user_type === 'employee'

  const [profileOpen, setProfileOpen] = useState(false)

  // Companies list is seeker-only in the UI (employees have no use for it),
  // fetched once the dashboard knows it's dealing with a seeker.
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [companiesError, setCompaniesError] = useState(false)

  useEffect(() => {
    if (!user || isEmployee) return
    let cancelled = false
    listCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch(() => {
        if (!cancelled) setCompaniesError(true)
      })
    return () => {
      cancelled = true
    }
  }, [user, isEmployee])

  // Referral inbox is employee-only, symmetric to the seeker's companies
  // list above.
  const [inbox, setInbox] = useState<ReferralInboxItem[] | null>(null)
  const [inboxError, setInboxError] = useState(false)

  useEffect(() => {
    if (!user || !isEmployee) return
    let cancelled = false
    listReferralInbox()
      .then((data) => {
        if (!cancelled) setInbox(data)
      })
      .catch(() => {
        if (!cancelled) setInboxError(true)
      })
    return () => {
      cancelled = true
    }
  }, [user, isEmployee])

  if (!user) return null

  return (
    <BrandedPage>
      {/* Fixed top-right — stays put regardless of how much content the
          page grows to, independent of BrandedPage's own centered flex
          layout (which we deliberately don't touch — it's shared across
          verticals). */}
      <div style={{ position: 'fixed', top: '1.5rem', right: '1.75rem', display: 'flex', gap: '0.6rem', zIndex: 10 }}>
        <IconButton title="Profile" onClick={() => setProfileOpen(true)}>
          <ProfileIcon width={19} height={19} />
        </IconButton>
        <IconButton title="Sign out" onClick={logout}>
          <LogoutIcon width={19} height={19} />
        </IconButton>
      </div>

      <div style={{ width: '100%', maxWidth: '900px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {isEmployee ? 'Referral requests' : 'Companies available for referrals'}
        </h1>

        {!isEmployee && (
          <>
            {companiesError && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                Couldn't load companies right now — try refreshing the page.
              </p>
            )}
            {!companiesError && companies === null && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading…</p>
            )}
            {companies && companies.length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                No companies yet — check back soon as more employees join.
              </p>
            )}
            {companies && companies.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {companies.map((c) => (
                  <Link
                    key={c.name + c.careers_url}
                    to={`/jobref/refer?company=${encodeURIComponent(c.name)}&careers_url=${encodeURIComponent(c.careers_url)}`}
                    style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                      textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                        Tap to request a referral
                      </span>
                    </div>
                    <div style={{
                      flexShrink: 0, padding: '0.25rem 0.65rem', background: 'var(--success-bg)',
                      border: '1px solid var(--success-border)', borderRadius: '999px', fontSize: '0.7rem',
                      fontWeight: 600, color: 'var(--success)', whiteSpace: 'nowrap',
                    }}>
                      {c.referrer_count} {c.referrer_count === 1 ? 'referrer' : 'referrers'}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {isEmployee && (
          <>
            {inboxError && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                Couldn't load your requests right now — try refreshing the page.
              </p>
            )}
            {!inboxError && inbox === null && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading…</p>
            )}
            {inbox && inbox.length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                No referral requests yet — job seekers will show up here once they reach out.
              </p>
            )}
            {inbox && inbox.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                {inbox.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)' }}>
                          {r.first_name} {r.last_name}
                        </div>
                        <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{
                        flexShrink: 0, padding: '0.25rem 0.65rem', background: 'var(--warn-bg)',
                        border: '1px solid var(--warn-border)', borderRadius: '999px', fontSize: '0.7rem',
                        fontWeight: 600, color: 'var(--warn)', whiteSpace: 'nowrap',
                      }}>
                        {STATUS_LABEL[r.status]}
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-2)', fontSize: '0.83rem', margin: 0, fontStyle: 'italic' }}>
                      "{r.message}"
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                      <a href={r.job_link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Job posting ↗</a>
                      <a href={r.cv_drive_link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>CV ↗</a>
                      <a href={r.cover_letter_drive_link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Cover letter ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Back to LVAMO</Link>
        </p>
      </div>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </BrandedPage>
  )
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '999px',
        color: 'var(--text-2)', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
