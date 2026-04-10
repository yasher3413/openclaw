import { supabaseAdmin } from './supabaseAdmin'

export type OAuthTokenRecord = {
  user_id: string
  provider: 'google' | 'microsoft'
  email?: string
  access_token: string
  refresh_token?: string
  expires_at?: string
  scope?: string
}

export const upsertToken = async (record: OAuthTokenRecord) => {
  if (!supabaseAdmin) return false
  const { error } = await supabaseAdmin.from('oauth_tokens').upsert(record, {
    onConflict: 'user_id,provider',
  })
  if (error) {
    console.error(error)
    return false
  }
  return true
}

export const getToken = async (userId: string, provider: 'google' | 'microsoft') => {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  if (error) {
    console.error(error)
    return null
  }
  return data
}
