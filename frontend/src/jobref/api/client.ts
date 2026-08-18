import axios from 'axios'

// Every Jobref endpoint lives under this vertical's namespace, and uses its
// own localStorage token key, so it can never collide with Applaut's (or any
// future vertical's) session — see PROGRESS.md's Multi-Vertical Architecture
// section.
export const TOKEN_KEY = 'jobref_access_token'

// Jobref has its own backend hostname in production (api.jobref.lvamo.com,
// proxied by the same shared nginx/backend as Applaut — see PROGRESS.md) —
// a separate Cloudflare Pages build var from Applaut's
// VITE_APPLAUT_API_BASE_URL, so set VITE_JOBREF_API_BASE_URL there. Both
// fall back to the same local backend in dev, since docker-compose only
// runs one backend container.
export const API_ROOT = import.meta.env.VITE_JOBREF_API_BASE_URL ?? 'http://localhost:8000'

const client = axios.create({
  baseURL: API_ROOT + '/api/v1/jobref',
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
