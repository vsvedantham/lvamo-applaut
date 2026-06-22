import api from './axios'

export interface Application {
  id: string
  opportunity_id: string
  profile_id: string
  score_id: string | null
  status: ApplicationStatus
  notes: string | null
  applied_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
  opportunity_title: string
  opportunity_company: string
  opportunity_location: string | null
  opportunity_url: string | null
}

export type ApplicationStatus =
  | 'pending_review'
  | 'approved'
  | 'submitted'
  | 'rejected'
  | 'withdrawn'
  | 'interviewing'
  | 'offered'
  | 'closed'

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  submitted: 'Submitted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  interviewing: 'Interviewing',
  offered: 'Offered',
  closed: 'Closed',
}

export const PIPELINE_STATUSES: ApplicationStatus[] = [
  'pending_review',
  'approved',
  'submitted',
  'interviewing',
  'offered',
]

export const TERMINAL_STATUSES: ApplicationStatus[] = ['rejected', 'withdrawn', 'closed']

export async function createApplication(
  opportunity_id: string,
  score_id?: string,
  notes?: string,
): Promise<Application> {
  const res = await api.post('/applications', { opportunity_id, score_id, notes })
  return res.data
}

export async function listApplications(status?: ApplicationStatus): Promise<Application[]> {
  const params = status ? { status } : {}
  const res = await api.get('/applications', { params })
  return res.data.items
}

export async function getApplication(id: string): Promise<Application> {
  const res = await api.get(`/applications/${id}`)
  return res.data
}

export async function updateApplication(
  id: string,
  updates: { status?: ApplicationStatus; notes?: string },
): Promise<Application> {
  const res = await api.patch(`/applications/${id}`, updates)
  return res.data
}

export async function deleteApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`)
}
