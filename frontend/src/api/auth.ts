import client from './client'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: string
  name: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/api/v1/auth/register', {
    name,
    email,
    password,
  })
  return data
}

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/api/v1/auth/login', {
    email,
    password,
  })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/api/v1/auth/me')
  return data
}
