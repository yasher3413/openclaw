import { supabase } from './supabase'

const getAccessToken = async () => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

const fetchWithAuth = async (input: string, init?: RequestInit) => {
  const token = await getAccessToken()
  if (!token) throw new Error('No session token')
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}

export const startGoogleOAuth = (userId: string) => {
  window.location.href = `/api/auth/google/start?user_id=${encodeURIComponent(
    userId,
  )}`
}

export const startMicrosoftOAuth = (userId: string) => {
  window.location.href = `/api/auth/microsoft/start?user_id=${encodeURIComponent(
    userId,
  )}`
}

export const fetchUnreadEmail = async (provider: 'google' | 'microsoft') => {
  const response = await fetchWithAuth(`/api/email/unread?provider=${provider}`)
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export const sendEmail = async (
  provider: 'google' | 'microsoft',
  payload: { to: string; subject: string; body: string },
) => {
  const response = await fetchWithAuth(`/api/email/send?provider=${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export const fetchUpcomingEvents = async (provider: 'google' | 'microsoft') => {
  const response = await fetchWithAuth(
    `/api/calendar/upcoming?provider=${provider}`,
  )
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export const createEvent = async (
  provider: 'google' | 'microsoft',
  payload: {
    title: string
    description?: string
    start: string
    end: string
    attendees?: string[]
    location?: string
  },
) => {
  const response = await fetchWithAuth(`/api/calendar/create?provider=${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}
