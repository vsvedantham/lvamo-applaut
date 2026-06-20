import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyProfile, type Profile } from '../api/profile'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
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

      {profileLoading ? (
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading profile…</p>
      ) : profile === null ? (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px dashed #d1d5db', borderRadius: '8px', maxWidth: '480px' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Complete your profile to start discovery</p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Tell us your target roles, locations, and preferences so we can find the right jobs for you.
          </p>
          <Link
            to="/onboarding"
            style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            Set up profile →
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '480px' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{profile.display_name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <p>Roles: {profile.target_roles.join(', ')}</p>
              <p>Countries: {profile.target_countries.join(', ')}</p>
              <p>Remote: {profile.remote_preference}</p>
              <p>Discovery: every {profile.discovery_frequency_hours}h</p>
            </div>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Job discovery and applications coming soon.</p>
        </div>
      )}
    </div>
  )
}
