import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { Capture } from '../lib/types'
import { createId } from '../lib/utils'
import { sendToSupermemory } from '../lib/supermemory'

type QuickCaptureProps = {
  user: User | null
}

export const QuickCapture = ({ user }: QuickCaptureProps) => {
  const { rows: captures, setRows: setCaptures } = useSupabaseTable<Capture>(
    'daily_captures',
    STORAGE_KEYS.captures,
    [],
    user,
  )
  const [content, setContent] = useState('')
  const [tag, setTag] = useState<Capture['tag']>('idea')

  const addCapture = () => {
    if (!content.trim()) return
    sendToSupermemory(content, tag, 'openclaw_capture')
    setCaptures([
      {
        id: createId(),
        created_at: new Date().toISOString(),
        content,
        tag,
      },
      ...captures,
    ])
    setContent('')
    setTag('idea')
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-night-400">
          Quick Capture
        </p>
        <h2 className="text-2xl font-semibold text-white">Inbox</h2>
      </header>

      <section className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
        <textarea
          className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
          rows={4}
          placeholder="Dump ideas, tasks, or thoughts without losing them."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            value={tag}
            onChange={(event) => setTag(event.target.value as Capture['tag'])}
          >
            {['idea', 'writing', 'work', 'fitness', 'personal'].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950"
            onClick={addCapture}
          >
            Save
          </button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {captures.map((capture) => (
          <div
            key={capture.id}
            className="rounded-2xl border border-night-700 bg-night-900/70 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-night-400">
              {capture.tag}
            </p>
            <p className="mt-2 text-sm text-white">{capture.content}</p>
            <p className="mt-2 text-[11px] text-night-400">
              {new Date(capture.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
