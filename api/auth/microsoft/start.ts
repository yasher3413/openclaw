import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI
  const userId = req.query.user_id as string

  if (!clientId || !redirectUri || !userId) {
    res.status(400).send('Missing Microsoft OAuth config or user_id')
    return
  }

  const scope = [
    'offline_access',
    'Mail.Read',
    'Mail.Send',
    'Calendars.ReadWrite',
  ].join(' ')

  const state = Buffer.from(JSON.stringify({ user_id: userId })).toString('base64')

  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', scope)
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)

  res.writeHead(302, { Location: url.toString() })
  res.end()
}
