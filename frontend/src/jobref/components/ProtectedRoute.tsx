import { Navigate } from 'react-router-dom'
import { useJobrefAuth } from '../context/AuthContext'

export default function JobrefProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useJobrefAuth()
  if (loading) return <div style={{ padding: '2rem' }}>Loading…</div>
  if (!user) return <Navigate to="/jobref/login" replace />
  return <>{children}</>
}
