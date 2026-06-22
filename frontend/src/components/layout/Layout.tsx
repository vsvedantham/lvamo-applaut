import { Outlet, NavLink } from 'react-router-dom'

const navStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: isActive ? 600 : 400,
  color: isActive ? '#111827' : '#6b7280',
  borderBottom: isActive ? '2px solid #111827' : '2px solid transparent',
  paddingBottom: '2px',
})

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <strong>LVAMO / Applaut</strong>
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <NavLink to="/dashboard" style={navStyle}>Dashboard</NavLink>
          <NavLink to="/opportunities" style={navStyle}>Jobs</NavLink>
          <NavLink to="/scores" style={navStyle}>Scores</NavLink>
          <NavLink to="/applications" style={navStyle}>Applications</NavLink>
        </nav>
      </header>
      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
      <footer style={{ padding: '1rem 2rem', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
        <small>&copy; 2026 LVAMO</small>
      </footer>
    </div>
  )
}
