import client from './client'

export type ReferralRequestStatus = 'pending_review'

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
