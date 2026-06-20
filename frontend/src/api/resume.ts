import client from './client'

export interface ExperienceEntry {
  title: string
  company: string
  location?: string
  start_date?: string
  end_date?: string
  description?: string
}

export interface EducationEntry {
  degree: string
  institution: string
  field?: string
  start_date?: string
  end_date?: string
}

export interface CertificationEntry {
  name: string
  issuer?: string
  date?: string
}

export interface ExtractedContent {
  skills: string[]
  languages: string[]
  experience: ExperienceEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
}

export interface Resume {
  id: string
  user_id: string
  file_name: string
  is_master: boolean
  version: number
  content_extracted: ExtractedContent | null
  created_at: string
  updated_at: string
}

export async function uploadResume(file: File): Promise<Resume> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<Resume>('/api/v1/resumes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getMyResume(): Promise<Resume> {
  const { data } = await client.get<Resume>('/api/v1/resumes/me')
  return data
}

export async function updateExtractedContent(
  payload: Partial<ExtractedContent>,
): Promise<Resume> {
  const { data } = await client.patch<Resume>('/api/v1/resumes/me', payload)
  return data
}
