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

export interface ReferralInboxItem {
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

export async function listReferralInbox(): Promise<ReferralInboxItem[]> {
  const { data } = await client.get<ReferralInboxItem[]>('/referral-requests')
  return data
}
