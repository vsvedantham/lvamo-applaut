import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyProfile, type Profile } from '../api/profile'
import { getMyResume, type Resume } from '../api/resume'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resume, setResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getMyProfile(), getMyResume()]).then(([p, r]) => {
      setProfile(p.status === 'fulfilled' ? p.value : null)
      setResume(r.status === 'fulfilled' ? r.value : null)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
        <button
          onClick={logout}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
        >
          Log out
        </button>
      </div>

      <p>Hello, <strong>{user?.name}</strong>.</p>

      {loading ? (
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading…</p>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '520px' }}>
          {/* Profile card */}
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

          {/* Resume card */}
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
            <Cta
              title="Find jobs"
              description="Run discovery to search across Greenhouse, Lever, Ashby and Personio job boards."
              href="/opportunities"
              label="View opportunities →"
            />
          )}
        </div>
      )}
    </div>
  )
}

function Cta({ title, description, href, label }: { title: string; description: string; href: string; label: string }) {
  return (
    <div style={{ padding: '1.25rem', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{title}</p>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.875rem' }}>{description}</p>
      <Link to={href} style={{ display: 'inline-block', padding: '0.4rem 1rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem' }}>
        {label}
      </Link>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</p>
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
