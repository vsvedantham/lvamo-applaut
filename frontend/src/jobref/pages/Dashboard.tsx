import { Link } from 'react-router-dom'
import BrandedPage from '../../components/BrandedPage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useJobrefAuth } from '../context/AuthContext'
import type { ReferralViewCapacity } from '../api/auth'

const CAPACITY_LABEL: Record<ReferralViewCapacity, string> = {
  up_to_5: 'Max 5',
  '5_to_10': '5 - 10',
  '10_to_20': '10 - 20',
  no_cap: 'No cap',
}

export default function JobrefDashboard() {
  useDocumentTitle('Dashboard | Jobref')
  const { user, logout } = useJobrefAuth()

  if (!user) return null

  const isEmployee = user.user_type === 'employee'

  return (
    <BrandedPage>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', padding: '0.3rem 0.8rem', background: 'var(--warn-bg)',
            border: '1px solid var(--warn-border)', borderRadius: '999px', fontSize: '0.75rem',
            fontWeight: 500, color: 'var(--warn)', letterSpacing: '0.04em', marginBottom: '1.25rem',
          }}>
            {isEmployee ? 'Employee' : 'Job seeker'}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Welcome, {user.first_name}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            Domain: {user.domain}
          </p>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {isEmployee && user.employee_profile && (
            <>
              <Row label="Company" value={user.employee_profile.company_name} />
              <Row label="Working since" value={user.employee_profile.working_since} />
              <Row label="Careers page" value={user.employee_profile.company_careers_url} link />
              <Row
                label="Referrals"
                value={`${CAPACITY_LABEL[user.employee_profile.referral_capacity]} per ${user.employee_profile.refer_frequency === 'weekly' ? 'week' : 'month'}`}
              />
              <Row
                label="Requests viewed"
                value={`${CAPACITY_LABEL[user.employee_profile.daily_referral_view_cap]} per day`}
              />
            </>
          )}
          {!isEmployee && user.seeker_profile && (
            <>
              <Row label="Status" value={user.seeker_profile.current_job_status.replace('_', ' ')} />
              {user.seeker_profile.notice_join_date && (
                <Row label="Available from" value={user.seeker_profile.notice_join_date} />
              )}
              <Row label="CV" value={user.seeker_profile.cv_drive_link} link />
            </>
          )}
        </div>

        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={logout}
            style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-2)', borderRadius: 'var(--radius-xs)', padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </p>
        <p style={{ marginTop: '0.75rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>
          <Link to="/" style={{ color: 'var(--text-3)' }}>Back to LVAMO</Link>
        </p>
      </div>
    </BrandedPage>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
          {value}
        </a>
      ) : (
        <span style={{ color: 'var(--text-1)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
      )}
    </div>
  )
}
