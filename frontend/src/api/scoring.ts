import client from './client'

export type ScoringMode = 'rule_based' | 'ai'
export type FilterType = 'good' | 'near_miss' | 'all'

export interface NearMissKeyword {
  keyword: string
  suitable: boolean | null
  reason: string
}

export interface ScoreDimension {
  score: number
  max: number
  explanation: string
}

export interface Score {
  id: string
  opportunity_id: string
  profile_id: string
  total_score: number
  skills_score: number | null
  experience_score: number | null
  location_score: number | null
  employment_type_score: number | null
  explanation: Record<string, ScoreDimension>
  scoring_mode: string
  near_miss_keywords: NearMissKeyword[] | null
  user_decision: string | null
  ai_model: string | null
  created_at: string
}

export interface ScoringRunResult {
  scored: number
  good_matches: number
  near_misses: number
  below_threshold: number
  mode: string
}

export interface ScoreList {
  items: Score[]
  total: number
  page: number
  page_size: number
}

export async function runScoring(mode: ScoringMode = 'rule_based'): Promise<ScoringRunResult> {
  const { data } = await client.post<ScoringRunResult>(`/api/v1/scoring/run?mode=${mode}`)
  return data
}

export async function listScores(params?: {
  filter_type?: FilterType
  page?: number
  page_size?: number
}): Promise<ScoreList> {
  const { data } = await client.get<ScoreList>('/api/v1/scores', { params })
  return data
}

export async function decideNearMiss(
  scoreId: string,
  action: 'keep' | 'dismiss' | 'keep_with_keywords',
  keywordsToAdd: string[] = [],
): Promise<Score> {
  const { data } = await client.post<Score>(`/api/v1/scores/${scoreId}/decide`, {
    action,
    keywords_to_add: keywordsToAdd,
  })
  return data
}
