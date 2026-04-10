import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_lib/auth'
import { getValidToken } from '../_lib/providers'

const buildRawMessage = (to: string, subject: string, body: string) => {
  const raw = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\r\n')
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

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

  const { to, subject, body } = req.body ?? {}
  if (!to || !subject || !body) {
    res.status(400).json({ error: 'Missing to/subject/body' })
    return
  }

  if (provider === 'google') {
    const raw = buildRawMessage(to, subject, body)
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      },
    )
    if (!response.ok) {
      res.status(500).json({ error: await response.text() })
      return
    }
    res.status(200).json({ status: 'sent' })
    return
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: [
          {
            emailAddress: { address: to },
          },
        ],
      },
    }),
  })
  if (!response.ok) {
    res.status(500).json({ error: await response.text() })
    return
  }
  res.status(200).json({ status: 'sent' })
}
