import client from './client'

export interface Profile {
  id: string
  user_id: string
  display_name: string
  total_experience_years: number | null
  target_roles: string[]
  target_countries: string[]
  remote_preference: string
  employment_types: string[]
  skills: string[]
  languages: string[]
  discovery_frequency_hours: number
  discovery_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateProfilePayload {
  display_name: string
  total_experience_years?: number
  target_roles: string[]
  target_countries: string[]
  remote_preference: string
  employment_types: string[]
  skills: string[]
  languages: string[]
  discovery_frequency_hours: number
}

export async function createProfile(data: CreateProfilePayload): Promise<Profile> {
  const { data: res } = await client.post<Profile>('/api/v1/profiles', data)
  return res
}

export async function getMyProfile(): Promise<Profile> {
  const { data } = await client.get<Profile>('/api/v1/profiles/me')
  return data
}

export async function updateMyProfile(
  data: Partial<CreateProfilePayload>,
): Promise<Profile> {
  const { data: res } = await client.patch<Profile>('/api/v1/profiles/me', data)
  return res
}
