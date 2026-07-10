import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem 0.75rem',
  marginTop: '0.25rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '1rem',
  boxSizing: 'border-box',
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/onboarding')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create account</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        Registration is currently invite-only while we finish building. Check back soon.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.4, pointerEvents: 'none' }}>
        <div>
          <label htmlFor="name">Full name</label>
          <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="password">Password <span style={{ color: '#6b7280', fontWeight: 400 }}>(min. 8 characters)</span></label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </div>
        <button
          type="button"
          disabled
          style={{ padding: '0.625rem', background: '#9ca3af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontSize: '1rem' }}
        >
          Registration closed
        </button>
      </form>
      <p style={{ marginTop: '1.25rem', color: '#6b7280' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#2563eb' }}>Log in</Link>
      </p>
    </div>
  )
}
