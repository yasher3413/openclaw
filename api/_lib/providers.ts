import { getToken, upsertToken } from './tokenStore'

const refreshGoogleToken = async (
  refreshToken: string,
  clientId: string,
  clientSecret: string,
) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

const refreshMicrosoftToken = async (
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
) => {
  const response = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'offline_access Mail.Read Mail.Send Calendars.ReadWrite',
      }),
    },
  )
  if (!response.ok) throw new Error(await response.text())
  return response.json()
}

export const getValidToken = async (
  userId: string,
  provider: 'google' | 'microsoft',
) => {
  const record = await getToken(userId, provider)
  if (!record) return null

  const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0
  const isExpired = expiresAt && Date.now() > expiresAt - 60 * 1000

  if (!isExpired) return record.access_token

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    if (!record.refresh_token || !clientId || !clientSecret) return record.access_token
    const refreshed = await refreshGoogleToken(
      record.refresh_token,
      clientId,
      clientSecret,
    )
    const expiresAtIso = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : undefined
    await upsertToken({
      user_id: record.user_id,
      provider: 'google',
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? record.refresh_token,
      scope: refreshed.scope ?? record.scope,
      expires_at: expiresAtIso,
      email: record.email,
    })
    return refreshed.access_token
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID || ''
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || ''
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || ''
  if (!record.refresh_token || !clientId || !clientSecret || !redirectUri) {
    return record.access_token
  }
  const refreshed = await refreshMicrosoftToken(
    record.refresh_token,
    clientId,
    clientSecret,
    redirectUri,
  )
  const expiresAtIso = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : undefined
  await upsertToken({
    user_id: record.user_id,
    provider: 'microsoft',
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? record.refresh_token,
    scope: refreshed.scope ?? record.scope,
    expires_at: expiresAtIso,
    email: record.email,
  })
  return refreshed.access_token
}
