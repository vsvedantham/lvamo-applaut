import client from './client'
import type { NearMissKeyword, ScoreDimension } from './opportunity'

export interface ScoreDecision {
  id: string
  opportunity_id: string
  total_score: number
  explanation: Record<string, ScoreDimension>
  scoring_mode: string
  near_miss_keywords: NearMissKeyword[] | null
  user_decision: string | null
  created_at: string
}

export async function decideNearMiss(
  scoreId: string,
  action: 'keep' | 'dismiss' | 'keep_with_keywords',
  keywordsToAdd: string[] = [],
): Promise<ScoreDecision> {
  const { data } = await client.post<ScoreDecision>(`/api/v1/scores/${scoreId}/decide`, {
    action,
    keywords_to_add: keywordsToAdd,
  })
  return data
}
