import type { SupabaseClient } from '@supabase/supabase-js'
import { STORAGE_KEYS, storage } from './storage'

export type SyncItem = {
  id: string
  table: string
  rows: Record<string, unknown>[]
}

export const enqueueSync = (item: SyncItem) => {
  const queue = storage.get<SyncItem[]>(STORAGE_KEYS.syncQueue, [])
  storage.set(STORAGE_KEYS.syncQueue, [...queue, item])
}

export const syncQueue = async (supabase: SupabaseClient | null) => {
  if (!supabase || !navigator.onLine) return
  const queue = storage.get<SyncItem[]>(STORAGE_KEYS.syncQueue, [])
  if (!queue.length) return
  const remaining: SyncItem[] = []
  for (const item of queue) {
    const { error } = await supabase
      .from(item.table)
      .upsert(item.rows, { onConflict: 'id' })
    if (error) {
      console.error(error)
      remaining.push(item)
    }
  }
  storage.set(STORAGE_KEYS.syncQueue, remaining)
}
