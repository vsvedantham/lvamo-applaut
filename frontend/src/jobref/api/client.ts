import axios from 'axios'

// Every Jobref endpoint lives under this vertical's namespace, and uses its
// own localStorage token key, so it can never collide with Applaut's (or any
// future vertical's) session — see PROGRESS.md's Multi-Vertical Architecture
// section.
export const TOKEN_KEY = 'jobref_access_token'

const client = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1/jobref',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
