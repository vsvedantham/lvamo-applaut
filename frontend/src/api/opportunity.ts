import client from './client'

export interface Opportunity {
  id: string
  source: string
  title: string
  company_name: string
  location_raw: string | null
  country_code: string | null
  remote_option: string | null
  employment_type: string | null
  application_url: string | null
  posted_at: string | null
  is_active: boolean
  created_at: string
}

export interface OpportunityDetail extends Opportunity {
  description: string | null
  requirements: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
}

export interface OpportunityList {
  items: Opportunity[]
  total: number
  page: number
  page_size: number
}

export interface DiscoveryRunResponse {
  new_jobs_found: number
  message: string
}

export async function runDiscovery(): Promise<DiscoveryRunResponse> {
  const { data } = await client.post<DiscoveryRunResponse>('/api/v1/discovery/run')
  return data
}

export async function listOpportunities(params?: {
  page?: number
  page_size?: number
  country_code?: string
  source?: string
}): Promise<OpportunityList> {
  const { data } = await client.get<OpportunityList>('/api/v1/opportunities', { params })
  return data
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  const { data } = await client.get<OpportunityDetail>(`/api/v1/opportunities/${id}`)
  return data
}
