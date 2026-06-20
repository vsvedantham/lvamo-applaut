import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Applaut</h1>
      <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '0.5rem' }}>
        AI-powered job application automation by LVAMO.
      </p>
      <p style={{ color: '#6b7280' }}>
        Reduce job application effort from hours per day to 10–20 minutes.
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link
          to="/register"
          style={{ padding: '0.625rem 1.5rem', background: '#111827', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}
        >
          Get started
        </Link>
        <Link
          to="/login"
          style={{ padding: '0.625rem 1.5rem', background: 'transparent', color: '#111827', border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none' }}
        >
          Log in
        </Link>
      </div>
    </div>
  )
}
