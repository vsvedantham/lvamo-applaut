import client from './client'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
  metadata: Record<string, unknown>
}

export interface NotificationListResponse {
  items: AppNotification[]
  unread_count: number
}

export async function getNotifications(): Promise<NotificationListResponse> {
  const res = await client.get('/notifications')
  return res.data
}

export async function getUnreadCount(): Promise<number> {
  const res = await client.get('/notifications/unread-count')
  return res.data.unread_count
}

export async function markRead(id: string): Promise<AppNotification> {
  const res = await client.post(`/notifications/${id}/read`)
  return res.data
}

export async function markAllRead(): Promise<void> {
  await client.post('/notifications/read-all')
}
