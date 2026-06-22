import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyProfile, type Profile } from '../api/profile'
import { getMyResume, type Resume } from '../api/resume'
import { getDashboardStats, type DashboardStats } from '../api/stats'

function StatCard({ label, value, sub, href, color }: {
  label: string
  value: number | string
  sub?: string
  href?: string
  color?: string
}) {
  const inner = (
    <div style={{
      padding: '1.25rem 1.5rem',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      transition: 'box-shadow 0.15s',
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: color ?? '#111827', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{sub}</p>}
    </div>
  )

  if (href) {
    return <Link to={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
  }
  return inner
}

function StatsGrid({ stats }: { stats: DashboardStats }) {
  const { applications: apps } = stats
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
      <StatCard
        label="Jobs found"
        value={stats.opportunities_found}
        href="/opportunities"
      />
      <StatCard
        label="Good matches"
        value={stats.good_matches}
        href="/scores"
        color="#059669"
      />
      <StatCard
        label="Near misses"
        value={stats.near_misses}
        href="/scores"
        color="#d97706"
      />
      <StatCard
        label="Documents"
        value={stats.documents_generated}
        sub="resumes + cover letters"
      />
      <StatCard
        label="Applications"
        value={apps.total}
        sub={apps.interviewing ? `${apps.interviewing} interviewing` : apps.submitted ? `${apps.submitted} submitted` : apps.pending_review ? `${apps.pending_review} pending` : undefined}
        href="/applications"
        color={apps.offered ? '#7e22ce' : undefined}
      />
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resume, setResume] = useState<Resume | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getMyProfile(), getMyResume(), getDashboardStats()]).then(([p, r, s]) => {
      setProfile(p.status === 'fulfilled' ? p.value : null)
      setResume(r.status === 'fulfilled' ? r.value : null)
      setStats(s.status === 'fulfilled' ? s.value : null)
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.2rem 0 0' }}>Welcome back, <strong style={{ color: '#111827' }}>{user?.name}</strong></p>
        </div>
        <button
          onClick={logout}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'transparent', fontSize: '0.875rem' }}
        >
          Log out
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : (
        <>
          {/* Stats */}
          {stats && <StatsGrid stats={stats} />}

          {/* Setup cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {profile === null ? (
              <Cta
                title="Complete your profile"
                description="Tell us your target roles, locations, and preferences so we can find the right jobs for you."
                href="/onboarding"
                label="Set up profile →"
              />
            ) : (
              <Card title={profile.display_name}>
                <Row label="Roles" value={profile.target_roles.join(', ')} />
                <Row label="Countries" value={profile.target_countries.join(', ')} />
                <Row label="Remote" value={profile.remote_preference} />
                <Row label="Discovery" value={`every ${profile.discovery_frequency_hours}h`} />
                <Link to="/onboarding" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>Edit profile</Link>
              </Card>
            )}

            {resume === null ? (
              <Cta
                title="Upload your resume"
                description="Upload your master resume and AI will extract your skills, experience, and education."
                href="/resume"
                label="Upload resume →"
              />
            ) : (
              <Card title="Master Resume">
                <Row label="File" value={resume.file_name} />
                <Row label="Version" value={String(resume.version)} />
                {resume.content_extracted && (
                  <Row label="Skills" value={resume.content_extracted.skills.slice(0, 5).join(', ') + (resume.content_extracted.skills.length > 5 ? ` +${resume.content_extracted.skills.length - 5} more` : '')} />
                )}
                <Link to="/resume" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>View / replace</Link>
              </Card>
            )}

            {profile && resume && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <Cta
                  title="Find jobs"
                  description="Browse and run discovery across job boards."
                  href="/opportunities"
                  label="View opportunities →"
                />
                <Cta
                  title="Score & review"
                  description="Rank jobs and act on near misses."
                  href="/scores"
                  label="View scores →"
                />
                <Cta
                  title="Documents"
                  description="Generate tailored resumes and cover letters."
                  href="/scores"
                  label="Go to scores →"
                />
                <Cta
                  title="Applications"
                  description="Track your pipeline from review to offer."
                  href="/applications"
                  label="View applications →"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Cta({ title, description, href, label }: { title: string; description: string; href: string; label: string }) {
  return (
    <div style={{ padding: '1.25rem', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.3rem', margin: '0 0 0.3rem' }}>{title}</p>
      <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.875rem', margin: '0 0 0.875rem' }}>{description}</p>
      <Link to={href} style={{ display: 'inline-block', padding: '0.35rem 0.9rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem' }}>
        {label}
      </Link>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.25rem', margin: '0 0 0.25rem' }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
      <span style={{ color: '#374151', fontWeight: 500 }}>{label}:</span> {value}
    </p>
  )
}
