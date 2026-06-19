import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb' }}>
        <strong>LVAMO / Applaut</strong>
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
