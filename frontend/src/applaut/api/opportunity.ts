import client from './client'

export interface ScoreDimension {
  score: number
  max: number
  explanation: string
}

export interface NearMissKeyword {
  keyword: string
  suitable: boolean | null
  reason: string
}

export interface OpportunityScore {
  id: string
  total_score: number
  explanation: Record<string, ScoreDimension>
  scoring_mode: string
  near_miss_keywords: NearMissKeyword[] | null
  user_decision: string | null
  created_at: string
}

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
  score: OpportunityScore | null
}

export interface OpportunityDetail extends Opportunity {
  description: string | null
  requirements: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
}

export type MatchFilter = 'all' | 'good' | 'near_miss' | 'below' | 'unscored'

export interface OpportunityList {
  items: Opportunity[]
  total: number
  page: number
  page_size: number
  good_threshold: number
  near_miss_threshold: number
}

export interface DiscoveryRunResponse {
  new_jobs_found: number
  scored: number
  good_matches: number
  near_misses: number
  message: string
}

export async function runDiscovery(): Promise<DiscoveryRunResponse> {
  const { data } = await client.post<DiscoveryRunResponse>('/discovery/run')
  return data
}

export async function listOpportunities(params?: {
  page?: number
  page_size?: number
  country_code?: string
  source?: string
  match?: MatchFilter
}): Promise<OpportunityList> {
  const { data } = await client.get<OpportunityList>('/opportunities', { params })
  return data
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  const { data } = await client.get<OpportunityDetail>(`/opportunities/${id}`)
  return data
}
