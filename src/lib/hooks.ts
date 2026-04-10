import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { fetchRows, upsertRows } from './db'
import { enqueueSync } from './sync'
import { storage } from './storage'
import { supabase } from './supabase'

export const useSupabaseTable = <T extends { id: string }>(
  table: string,
  storageKey: string,
  defaultValue: T[],
  user: User | null,
) => {
  const [rows, setRows] = useState<T[]>(() => storage.get(storageKey, defaultValue))

  useEffect(() => {
    storage.set(storageKey, rows)
  }, [rows, storageKey])

  useEffect(() => {
    if (!supabase || !user) return
    let mounted = true
    fetchRows<T>(supabase, table, user.id).then((data) => {
      if (!mounted) return
      if (data.length) {
        setRows(data)
      }
    })
    return () => {
      mounted = false
    }
  }, [table, user])

  const saveRows = async (next: T[]) => {
    setRows(next)
    if (!user || !supabase) return
    const rowsWithUser = next.map((row) => ({ ...row, user_id: user.id }))
    if (!navigator.onLine) {
      enqueueSync({
        id: crypto.randomUUID(),
        table,
        rows: rowsWithUser,
      })
      return
    }
    await upsertRows(supabase, table, rowsWithUser)
  }

  return useMemo(() => ({ rows, setRows: saveRows }), [rows])
}
