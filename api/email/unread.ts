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
    const listResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=5',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (!listResponse.ok) {
      res.status(500).json({ error: await listResponse.text() })
      return
    }
    const listData = await listResponse.json()
    const messages = listData.messages ?? []
    const results = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const detailData = await detailResponse.json()
        const headers = detailData.payload?.headers ?? []
        const subject = headers.find((h: { name: string }) => h.name === 'Subject')
        const from = headers.find((h: { name: string }) => h.name === 'From')
        return {
          id: msg.id,
          subject: subject?.value ?? '(no subject)',
          from: from?.value ?? '',
          snippet: detailData.snippet ?? '',
        }
      }),
    )
    res.status(200).json({ provider, messages: results })
    return
  }

  const graphResponse = await fetch(
    'https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$filter=isRead eq false&$top=5&$select=subject,from,receivedDateTime,bodyPreview,webLink',
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!graphResponse.ok) {
    res.status(500).json({ error: await graphResponse.text() })
    return
  }
  const data = await graphResponse.json()
  const messages = (data.value ?? []).map((item: any) => ({
    id: item.id,
    subject: item.subject,
    from: item.from?.emailAddress?.address ?? '',
    snippet: item.bodyPreview ?? '',
    link: item.webLink ?? '',
  }))
  res.status(200).json({ provider, messages })
}
