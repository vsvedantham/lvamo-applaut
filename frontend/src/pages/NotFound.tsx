import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div>
      <h2>404 — Page not found</h2>
      <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" style={{ color: '#2563eb' }}>Go home</Link>
    </div>
  )
}
