import { createContext, useContext, useEffect, useState } from 'react'
import { TOKEN_KEY } from '../api/client'
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  type JobrefUser,
  type ProfileUpdatePayload,
  type RegisterPayload,
} from '../api/auth'

interface AuthContextType {
  user: JobrefUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Applies across the whole authenticated Jobref session — any page, both
// user types — since this provider wraps the entire app, not just
// individual routes.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000

export function JobrefAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JobrefUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  // 5 minutes of no mouse/keyboard/touch/scroll activity signs the user
  // out. Only armed while actually logged in; ProtectedRoute picks up the
  // resulting user=null and redirects to login on its own, so no
  // navigation needs to happen here.
  useEffect(() => {
    if (!user) return
    let timer: ReturnType<typeof setTimeout>
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
      }, IDLE_TIMEOUT_MS)
    }
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer))
    resetTimer()
    return () => {
      clearTimeout(timer)
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer))
    }
  }, [user])

  const login = async (email: string, password: string) => {
    const { access_token } = await apiLogin(email, password)
    localStorage.setItem(TOKEN_KEY, access_token)
    const me = await getMe()
    setUser(me)
  }

  const register = async (payload: RegisterPayload) => {
    const { access_token } = await apiRegister(payload)
    localStorage.setItem(TOKEN_KEY, access_token)
    const me = await getMe()
    setUser(me)
  }

  const updateProfile = async (payload: ProfileUpdatePayload) => {
    const updated = await apiUpdateProfile(payload)
    setUser(updated)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useJobrefAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useJobrefAuth must be used inside JobrefAuthProvider')
  return ctx
}
