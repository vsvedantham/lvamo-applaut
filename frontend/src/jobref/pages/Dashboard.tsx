import { useEffect, useState } from 'react'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useJobrefAuth } from '../context/AuthContext'
import { listCompanies, type Company } from '../api/companies'
import { listMyReferralRequests, type ReferralRequestItem } from '../api/referralRequests'
import { STATUS_COLOR, STATUS_LABEL } from '../constants'
import { Link } from 'react-router-dom'
import ProfilePanel from '../components/ProfilePanel'
import { LogoutIcon, ProfileIcon } from '../components/Icons'

// created_at is an ISO-8601 UTC instant (e.g. "2026-08-18T16:41:46Z") —
// the first 10 characters are the UTC calendar date, matching the
// backend's own UTC-day boundary for the once-per-day limit.
function utcDateOf(iso: string): string {
  return iso.slice(0, 10)
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

// The backend resets the once-per-day limit at UTC midnight; rendered via
// toLocaleString() so the seeker sees it in their own browser's timezone
// rather than having to do UTC math themselves.
function nextUtcMidnight(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
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

  // GET /referral-requests is dual-purpose server-side: an employee's own
  // inbox, or a seeker's own sent-request history (used here for the
  // "already requested" company badge and the once-per-day note/lockout).
  const [myRequests, setMyRequests] = useState<ReferralRequestItem[] | null>(null)
  const [myRequestsError, setMyRequestsError] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listMyReferralRequests()
      .then((data) => {
        if (!cancelled) setMyRequests(data)
      })
      .catch(() => {
        if (!cancelled) setMyRequestsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null

  // Seeker-only derived state: which companies they've already messaged
  // (ever), and whether they've used up today's one-request allowance.
  const requestedCompanyNames = new Set((myRequests ?? []).map(r => r.company_name))
  const sentToday = !isEmployee && (myRequests ?? []).some(r => utcDateOf(r.created_at) === todayUTC())

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

      <div style={{ width: '100%', maxWidth: isEmployee ? '900px' : '1150px' }}>
        {isEmployee && (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Referral requests</h1>
            {myRequestsError && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                Couldn't load your requests right now — try refreshing the page.
              </p>
            )}
            {!myRequestsError && myRequests === null && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading…</p>
            )}
            {myRequests && myRequests.length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                No referral requests yet — job seekers will show up here once they reach out.
              </p>
            )}
            {myRequests && myRequests.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                {myRequests.map((r) => {
                  const color = STATUS_COLOR[r.status]
                  return (
                    <Link
                      key={r.id}
                      to={`/jobref/requests/${r.id}`}
                      style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                        textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                          flexShrink: 0, padding: '0.25rem 0.65rem', background: color.bg,
                          border: `1px solid ${color.border}`, borderRadius: '999px', fontSize: '0.7rem',
                          fontWeight: 600, color: color.fg, whiteSpace: 'nowrap',
                        }}>
                          {STATUS_LABEL[r.status]}
                        </div>
                      </div>

                      <p style={{ color: 'var(--text-2)', fontSize: '0.83rem', margin: 0, fontStyle: 'italic' }}>
                        "{r.message}"
                      </p>

                      <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                        Tap to review
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

        {!isEmployee && (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Left: companies available for referral */}
            <div style={{ flex: '1 1 420px', minWidth: 0, paddingRight: '1.75rem', marginRight: '1.75rem', borderRight: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Companies available for referrals
              </h2>
              {sentToday && (
                <div style={{
                  padding: '0.75rem 1rem', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)',
                  borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem', fontSize: '0.83rem', color: 'var(--warn)',
                }}>
                  You've already sent a referral request today. You can send your next one after{' '}
                  <strong>{nextUtcMidnight().toLocaleString()}</strong>.
                </div>
              )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {companies.map((c) => {
                    const alreadyRequested = requestedCompanyNames.has(c.name)
                    const locked = sentToday
                    const cardStyle: React.CSSProperties = {
                      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                      textDecoration: 'none', transition: 'border-color 0.15s',
                      opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer',
                    }
                    const content = (
                      <>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </div>
                          <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                            {locked ? 'Locked until tomorrow' : 'Tap to request a referral'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                          <div style={{
                            padding: '0.25rem 0.65rem', background: 'var(--success-bg)',
                            border: '1px solid var(--success-border)', borderRadius: '999px', fontSize: '0.7rem',
                            fontWeight: 600, color: 'var(--success)', whiteSpace: 'nowrap',
                          }}>
                            {c.referrer_count} {c.referrer_count === 1 ? 'referrer' : 'referrers'}
                          </div>
                          {alreadyRequested && (
                            <div style={{
                              padding: '0.2rem 0.55rem', background: 'var(--accent-glow)',
                              border: '1px solid var(--accent-border)', borderRadius: '999px', fontSize: '0.68rem',
                              fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap',
                            }}>
                              Requested
                            </div>
                          )}
                        </div>
                      </>
                    )
                    return locked ? (
                      <div key={c.name + c.careers_url} style={cardStyle}>{content}</div>
                    ) : (
                      <Link
                        key={c.name + c.careers_url}
                        to={`/jobref/refer?company=${encodeURIComponent(c.name)}&careers_url=${encodeURIComponent(c.careers_url)}`}
                        style={cardStyle}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        {content}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right: requests this seeker has sent, and their outcome */}
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Referral requests sent
              </h2>
              {myRequestsError && (
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  Couldn't load your requests right now — try refreshing the page.
                </p>
              )}
              {!myRequestsError && myRequests === null && (
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading…</p>
              )}
              {myRequests && myRequests.length === 0 && (
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  You haven't sent any referral requests yet — pick a company on the left to get started.
                </p>
              )}
              {myRequests && myRequests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myRequests.map((r) => {
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
                          <div style={{ padding: '0.5rem 0.7rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-xs)' }}>
                            <p style={{ color: 'var(--success)', fontSize: '0.78rem', margin: 0 }}>
                              Accepted and sent for referral!
                            </p>
                          </div>
                        )}
                        {r.status === 'rejected' && (
                          <div style={{ padding: '0.5rem 0.7rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)' }}>
                            <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: 0 }}>
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
            </div>
          </div>
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
