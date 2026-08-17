import client from './client'

export interface ApplicationStats {
  total: number
  pending_review: number
  submitted: number
  interviewing: number
  offered: number
}

export interface DashboardStats {
  opportunities_found: number
  good_matches: number
  near_misses: number
  documents_generated: number
  applications: ApplicationStats
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await client.get('/stats')
  return res.data
}
