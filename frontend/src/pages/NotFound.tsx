import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div>
      <h2 style={{ color: 'var(--text-1)' }}>404 — Page not found</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-2)' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/applaut" style={{ color: 'var(--accent)' }}>Go home</Link>
    </div>
  )
}
