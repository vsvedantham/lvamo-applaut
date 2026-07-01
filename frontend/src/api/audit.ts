import client from './client'

export interface AuditEntry {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  after_state: Record<string, unknown> | null
  created_at: string
}

export interface AuditListResponse {
  items: AuditEntry[]
  total: number
  page: number
  page_size: number
}

export async function getAuditLogs(params?: {
  entity_type?: string
  page?: number
  page_size?: number
}): Promise<AuditListResponse> {
  const res = await client.get('/audit', { params })
  return res.data
}
