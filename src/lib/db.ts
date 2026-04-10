import type { SupabaseClient } from '@supabase/supabase-js'

export const fetchRows = async <T,>(
  supabase: SupabaseClient,
  table: string,
  userId: string,
) => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error(error)
    return [] as T[]
  }
  return (data ?? []) as T[]
}

export const upsertRows = async <T,>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
) => {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error(error)
    return false
  }
  return true
}
