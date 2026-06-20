import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

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
      <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>More features coming soon.</p>
    </div>
  )
}
