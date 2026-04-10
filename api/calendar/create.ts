import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_lib/auth'
import { getValidToken } from '../_lib/providers'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

  const { title, description, start, end, attendees, location } = req.body ?? {}
  if (!title || !start || !end) {
    res.status(400).json({ error: 'Missing title/start/end' })
    return
  }

  if (provider === 'google') {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: title,
          description,
          location,
          start: { dateTime: start },
          end: { dateTime: end },
          attendees: (attendees ?? []).map((email: string) => ({ email })),
        }),
      },
    )
    if (!response.ok) {
      res.status(500).json({ error: await response.text() })
      return
    }
    res.status(200).json({ status: 'created' })
    return
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: title,
      body: { contentType: 'Text', content: description ?? '' },
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      location: { displayName: location ?? '' },
      attendees: (attendees ?? []).map((email: string) => ({
        type: 'required',
        emailAddress: { address: email },
      })),
    }),
  })
  if (!response.ok) {
    res.status(500).json({ error: await response.text() })
    return
  }
  res.status(200).json({ status: 'created' })
}
