import type { VercelRequest, VercelResponse } from '@vercel/node'
import { upsertToken } from '../../_lib/tokenStore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const code = req.query.code as string
  const state = req.query.state as string

  if (!clientId || !clientSecret || !redirectUri || !code || !state) {
    res.status(400).send('Missing OAuth params')
    return
  }

  const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
  const userId = stateData.user_id as string

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    res.status(500).send(errorText)
    return
  }

  const tokenData = await tokenResponse.json()

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  await upsertToken({
    user_id: userId,
    provider: 'google',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    scope: tokenData.scope,
    expires_at: expiresAt ?? undefined,
  })

  res.writeHead(302, { Location: '/?integrations=google' })
  res.end()
}
