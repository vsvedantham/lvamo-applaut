import client from './client'

export type ReferralRequestStatus = 'pending_review' | 'under_review' | 'accepted' | 'rejected'

export interface ReferralRequestPayload {
  company_name: string
  company_careers_url: string
  first_name: string
  last_name: string
  job_link: string
  cv_drive_link: string
  cover_letter_drive_link: string
  message: string
}

export interface ReferralRequestResponse {
  id: string
  company_name: string
  created_at: string
}

// One row shape, two audiences — GET /referral-requests is dual-purpose
// server-side (see api/v1/routers/referral_requests.py): an employee's own
// inbox (requests routed to them), or a seeker's own sent-request history.
export interface ReferralRequestItem {
  id: string
  first_name: string
  last_name: string
  company_name: string
  job_link: string
  cv_drive_link: string
  cover_letter_drive_link: string
  message: string
  status: ReferralRequestStatus
  rejection_reason: string | null
  evidence_file_name: string | null
  created_at: string
}

export async function submitReferralRequest(
  payload: ReferralRequestPayload
): Promise<ReferralRequestResponse> {
  const { data } = await client.post<ReferralRequestResponse>('/referral-requests', payload)
  return data
}

export async function listMyReferralRequests(): Promise<ReferralRequestItem[]> {
  const { data } = await client.get<ReferralRequestItem[]>('/referral-requests')
  return data
}

// The employee's single-request review page. Fetching this is what moves
// a request from pending_review to under_review server-side — the "open
// = mark as being looked at" side effect described in the product spec.
export interface ReferralRequestDetail {
  id: string
  seeker_user_id: string
  first_name: string
  last_name: string
  company_name: string
  job_link: string
  cv_drive_link: string
  cover_letter_drive_link: string
  message: string
  status: ReferralRequestStatus
  rejection_reason: string | null
  evidence_file_name: string | null
  created_at: string
  reviewed_at: string | null
  job_posting_request_count: number
  seeker_request_count: number
}

export async function getReferralRequestDetail(id: string): Promise<ReferralRequestDetail> {
  const { data } = await client.get<ReferralRequestDetail>(`/referral-requests/${id}`)
  return data
}

export async function acceptReferralRequest(
  id: string,
  evidence?: File | null
): Promise<ReferralRequestDetail> {
  const form = new FormData()
  if (evidence) form.append('evidence', evidence)
  const { data } = await client.post<ReferralRequestDetail>(`/referral-requests/${id}/accept`, form)
  return data
}

export async function rejectReferralRequest(id: string, reason: string): Promise<ReferralRequestDetail> {
  const { data } = await client.post<ReferralRequestDetail>(`/referral-requests/${id}/reject`, { reason })
  return data
}
