import client from './client'

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

export async function submitReferralRequest(
  payload: ReferralRequestPayload
): Promise<ReferralRequestResponse> {
  const { data } = await client.post<ReferralRequestResponse>('/referral-requests', payload)
  return data
}
