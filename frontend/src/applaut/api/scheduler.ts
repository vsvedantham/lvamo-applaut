import client from './client'

export interface SchedulerStatus {
  jobs: { profile_id: string; next_run_at: string | null; interval_hours: number }[]
  discovery_enabled: boolean
  discovery_frequency_hours: number
  last_discovery_at: string | null
  last_scored_at: string | null
}

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const res = await client.get('/scheduler/status')
  return res.data
}

export async function enableDiscovery(): Promise<SchedulerStatus> {
  const res = await client.post('/scheduler/enable')
  return res.data
}

export async function disableDiscovery(): Promise<SchedulerStatus> {
  const res = await client.post('/scheduler/disable')
  return res.data
}
