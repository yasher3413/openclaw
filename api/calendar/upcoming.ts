import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_lib/auth'
import { getValidToken } from '../_lib/providers'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const provider = (req.query.provider as 'google' | 'microsoft') || 'google'
  const token = await getValidToken(user.id, provider)
  if (!token) {
    res.status(400).json({ error: 'No OAuth token stored' })
    return
  }

  if (provider === 'google') {
    const timeMin = new Date().toISOString()
    const url = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    )
    url.searchParams.set('maxResults', '5')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('timeMin', timeMin)
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      res.status(500).json({ error: await response.text() })
      return
    }
    const data = await response.json()
    const events = (data.items ?? []).map((event: any) => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      location: event.location ?? '',
    }))
    res.status(200).json({ provider, events })
    return
  }

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/events?$top=5&$orderby=start/dateTime',
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!response.ok) {
    res.status(500).json({ error: await response.text() })
    return
  }
  const data = await response.json()
  const events = (data.value ?? []).map((event: any) => ({
    id: event.id,
    title: event.subject,
    start: event.start?.dateTime,
    end: event.end?.dateTime,
    location: event.location?.displayName ?? '',
  }))
  res.status(200).json({ provider, events })
}
