import { type FormEvent, useEffect, useState } from 'react'
import { useJobrefAuth } from '../context/AuthContext'
import type {
  JobSeekerStatus,
  ProfileUpdatePayload,
  ReferFrequency,
  ReferralViewCapacity,
} from '../api/auth'
import { CloseIcon } from './Icons'

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.375rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)' }

const CAPACITY_OPTIONS: { value: ReferralViewCapacity; label: string }[] = [
  { value: 'up_to_5', label: '≤ 5' },
  { value: '5_to_10', label: '5 - 10' },
  { value: '10_to_20', label: '10 - 20' },
  { value: 'no_cap', label: 'No Cap' },
]

const CAPACITY_LABEL = Object.fromEntries(CAPACITY_OPTIONS.map(o => [o.value, o.label])) as Record<ReferralViewCapacity, string>

const JOB_STATUS_OPTIONS: { value: JobSeekerStatus; label: string }[] = [
  { value: 'none', label: 'Not currently employed' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'mini_job', label: 'Mini-job' },
  { value: 'serving_notice', label: 'Serving notice period' },
]

export default function ProfilePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateProfile } = useJobrefAuth()
  const isEmployee = user?.user_type === 'employee'

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [domain, setDomain] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [workingSince, setWorkingSince] = useState('')
  const [companyCareersUrl, setCompanyCareersUrl] = useState('')
  const [dailyReferralViewCap, setDailyReferralViewCap] = useState<ReferralViewCapacity>('up_to_5')
  const [referFrequency, setReferFrequency] = useState<ReferFrequency>('weekly')
  const [referralCapacity, setReferralCapacity] = useState<ReferralViewCapacity>('up_to_5')

  const [jobStatus, setJobStatus] = useState<JobSeekerStatus>('none')
  const [noticeJoinDate, setNoticeJoinDate] = useState('')
  const [cvDriveLink, setCvDriveLink] = useState('')

  // Reset to a clean view of the current profile every time the panel
  // opens, rather than resuming whatever was left over from last time.
  useEffect(() => {
    if (!open || !user) return
    setEditing(false)
    setError('')
    setFirstName(user.first_name)
    setLastName(user.last_name)
    setPhone(user.phone)
    setDomain(user.domain)
    if (user.employee_profile) {
      setCompanyName(user.employee_profile.company_name)
      setWorkingSince(user.employee_profile.working_since)
      setCompanyCareersUrl(user.employee_profile.company_careers_url)
      setDailyReferralViewCap(user.employee_profile.daily_referral_view_cap)
      setReferFrequency(user.employee_profile.refer_frequency)
      setReferralCapacity(user.employee_profile.referral_capacity)
    }
    if (user.seeker_profile) {
      setJobStatus(user.seeker_profile.current_job_status)
      setNoticeJoinDate(user.seeker_profile.notice_join_date ?? '')
      setCvDriveLink(user.seeker_profile.cv_drive_link)
    }
  }, [open, user])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!user) return null

  const formValid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    phone.trim() !== '' &&
    domain.trim() !== '' &&
    (isEmployee
      ? companyName.trim() !== '' && workingSince !== '' && companyCareersUrl.trim() !== ''
      : cvDriveLink.trim() !== '' && (jobStatus !== 'serving_notice' || noticeJoinDate !== ''))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const payload: ProfileUpdatePayload = {
      first_name: firstName,
      last_name: lastName,
      phone,
      domain,
      ...(isEmployee
        ? {
            employee: {
              company_name: companyName,
              working_since: workingSince,
              company_careers_url: companyCareersUrl,
              daily_referral_view_cap: dailyReferralViewCap,
              refer_frequency: referFrequency,
              referral_capacity: referralCapacity,
            },
          }
        : {
            seeker: {
              current_job_status: jobStatus,
              notice_join_date: jobStatus === 'serving_notice' ? noticeJoinDate : null,
              cv_drive_link: cvDriveLink,
            },
          }),
    }
    setLoading(true)
    try {
      await updateProfile(payload)
      setEditing(false)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join(' ')
          : detail ?? 'Could not save your changes — please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 30,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s',
        }}
      />
      <div
        role="dialog"
        aria-label="Profile"
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(400px, 100vw)',
          background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border)', zIndex: 31,
          transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease',
          overflowY: 'auto', padding: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Profile</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer',
              width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.7rem 0.875rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.825rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {!editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <ViewRow label="Name" value={`${user.first_name} ${user.last_name}`} />
              <ViewRow label="Email" value={user.email} />
              <ViewRow label="Phone" value={user.phone} />
              <ViewRow label="Domain" value={user.domain} />
              {isEmployee && user.employee_profile && (
                <>
                  <ViewRow label="Company" value={user.employee_profile.company_name} />
                  <ViewRow label="Working since" value={user.employee_profile.working_since} />
                  <ViewRow label="Careers page" value={user.employee_profile.company_careers_url} link />
                  <ViewRow
                    label="Referrals"
                    value={`${CAPACITY_LABEL[user.employee_profile.referral_capacity]} per ${user.employee_profile.refer_frequency === 'weekly' ? 'week' : 'month'}`}
                  />
                  <ViewRow
                    label="Requests reviewed"
                    value={`${CAPACITY_LABEL[user.employee_profile.daily_referral_view_cap]} per day`}
                  />
                </>
              )}
              {!isEmployee && user.seeker_profile && (
                <>
                  <ViewRow label="Status" value={user.seeker_profile.current_job_status.replace('_', ' ')} capitalize />
                  {user.seeker_profile.notice_join_date && (
                    <ViewRow label="Available from" value={user.seeker_profile.notice_join_date} />
                  )}
                  <ViewRow label="CV" value={user.seeker_profile.cv_drive_link} link />
                </>
              )}
            </div>

            <button
              onClick={() => setEditing(true)}
              style={{
                padding: '0.625rem', background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Edit profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={field}>
                <label style={labelStyle}>First name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div style={field}>
                <label style={labelStyle}>Last name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>

            <div style={field}>
              <label style={labelStyle}>Email <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(can't be changed)</span></label>
              <input type="email" value={user.email} disabled style={{ opacity: 0.65 }} />
            </div>

            <div style={field}>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>

            <div style={field}>
              <label style={labelStyle}>Professional field / domain</label>
              <input type="text" value={domain} onChange={e => setDomain(e.target.value)} required />
            </div>

            {isEmployee && (
              <>
                <div style={field}>
                  <label style={labelStyle}>Company name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                </div>
                <div style={field}>
                  <label style={labelStyle}>Working since</label>
                  <input type="date" value={workingSince} onChange={e => setWorkingSince(e.target.value)} required />
                </div>
                <div style={field}>
                  <label style={labelStyle}>Company careers page URL</label>
                  <input type="url" value={companyCareersUrl} onChange={e => setCompanyCareersUrl(e.target.value)} required />
                </div>
                <div style={field}>
                  <label style={labelStyle}>Referral requests reviewed per day</label>
                  <select value={dailyReferralViewCap} onChange={e => setDailyReferralViewCap(e.target.value as ReferralViewCapacity)}>
                    {CAPACITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={field}>
                  <label style={labelStyle}>Referrals made per…</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <SegmentButton active={referFrequency === 'weekly'} onClick={() => setReferFrequency('weekly')}>Week</SegmentButton>
                    <SegmentButton active={referFrequency === 'monthly'} onClick={() => setReferFrequency('monthly')}>Month</SegmentButton>
                  </div>
                </div>
                <div style={field}>
                  <select value={referralCapacity} onChange={e => setReferralCapacity(e.target.value as ReferralViewCapacity)}>
                    {CAPACITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {!isEmployee && (
              <>
                <div style={field}>
                  <label style={labelStyle}>Current job status</label>
                  <select value={jobStatus} onChange={e => setJobStatus(e.target.value as JobSeekerStatus)}>
                    {JOB_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {jobStatus === 'serving_notice' && (
                  <div style={field}>
                    <label style={labelStyle}>Available to join from</label>
                    <input type="date" value={noticeJoinDate} onChange={e => setNoticeJoinDate(e.target.value)} required />
                  </div>
                )}
                <div style={field}>
                  <label style={labelStyle}>CV Google Drive link</label>
                  <input type="url" value={cvDriveLink} onChange={e => setCvDriveLink(e.target.value)} required />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  flex: 1, padding: '0.625rem', background: 'transparent', color: 'var(--text-2)',
                  border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xs)', fontWeight: 600,
                  fontSize: '0.9rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formValid}
                style={{
                  flex: 1, padding: '0.625rem', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-xs)', fontWeight: 600, fontSize: '0.9rem',
                  opacity: loading || !formValid ? 0.5 : 1,
                  cursor: loading || !formValid ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

function ViewRow({ label, value, link, capitalize }: { label: string; value: string; link?: boolean; capitalize?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
          {value}
        </a>
      ) : (
        <span style={{ color: 'var(--text-1)', fontWeight: 500, textTransform: capitalize ? 'capitalize' : 'none', textAlign: 'right' }}>{value}</span>
      )}
    </div>
  )
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
        border: active ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
        background: active ? 'var(--accent-glow)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-2)',
      }}
    >
      {children}
    </button>
  )
}
