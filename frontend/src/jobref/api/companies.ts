import client from './client'

export interface Company {
  name: string
  careers_url: string
  referrer_count: number
}

export async function listCompanies(): Promise<Company[]> {
  const { data } = await client.get<Company[]>('/companies')
  return data
}
