import type { VercelRequest } from '@vercel/node'
import { supabaseAdmin } from './supabaseAdmin'

export const getUserFromRequest = async (req: VercelRequest) => {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : ''
  if (!token || !supabaseAdmin) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error) return null
  return data.user
}
