import axios from 'axios'

// Every Applaut endpoint lives under this vertical's namespace so future
// verticals (e.g. Jobref) can get their own base URL + auth without collision.
export const TOKEN_KEY = 'applaut_access_token'

const client = axios.create({
  baseURL: (import.meta.env.VITE_APPLAUT_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1/applaut',
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
