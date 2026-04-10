import type { User } from '@supabase/supabase-js'
import { useMemo, useState } from 'react'
import { defaultChapters } from '../data/defaults'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { Capture, Chapter, SubstackDraft, WritingSession } from '../lib/types'
import { createId, formatDate, todayKey } from '../lib/utils'
import { sendToSupermemory } from '../lib/supermemory'

const bookOne = 'To Have It Figured Out'
const bookTwo = "This Isn't the Main Thing"

const initialChapters = [
  ...defaultChapters(bookOne),
  ...defaultChapters(bookTwo),
]

type WritingHubProps = {
  user: User | null
}

export const WritingHub = ({ user }: WritingHubProps) => {
  const { rows: chapters, setRows: setChapters } = useSupabaseTable<Chapter>(
    'chapters',
    STORAGE_KEYS.chapters,
    initialChapters,
    user,
  )
  const { rows: sessions, setRows: setSessions } = useSupabaseTable<WritingSession>(
    'writing_sessions',
    STORAGE_KEYS.writingSessions,
    [],
    user,
  )
  const { rows: drafts, setRows: setDrafts } = useSupabaseTable<SubstackDraft>(
    'substack_drafts',
    STORAGE_KEYS.substackDrafts,
    [],
    user,
  )
  const { rows: captures, setRows: setCaptures } = useSupabaseTable<Capture>(
    'daily_captures',
    STORAGE_KEYS.captures,
    [],
    user,
  )

  const [draft, setDraft] = useState<SubstackDraft>({
    id: '',
    title: '',
    publication: '',
    draft_link: '',
    publish_date: '',
    notes: '',
  })
  const [sessionDraft, setSessionDraft] = useState<WritingSession>({
    id: '',
    date: todayKey(),
    word_count: 0,
    notes: '',
  })
  const [captureDraft, setCaptureDraft] = useState('')

  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    setChapters(
      chapters.map((chapter) =>
        chapter.id === id ? { ...chapter, ...updates } : chapter,
      ),
    )
  }

  const addDraft = () => {
    if (!draft.title.trim()) return
    setDrafts([{ ...draft, id: createId() }, ...drafts])
    setDraft({
      id: '',
      title: '',
      publication: '',
      draft_link: '',
      publish_date: '',
      notes: '',
    })
  }

  const addSession = () => {
    if (!sessionDraft.word_count) return
    setSessions([{ ...sessionDraft, id: createId() }, ...sessions])
    setSessionDraft({
      id: '',
      date: todayKey(),
      word_count: 0,
      notes: '',
    })
  }

  const addCapture = () => {
    if (!captureDraft.trim()) return
    sendToSupermemory(captureDraft, 'writing', 'openclaw_raw_writing')
    setCaptures([
      {
        id: createId(),
        created_at: new Date().toISOString(),
        content: captureDraft,
        tag: 'writing',
      },
      ...captures,
    ])
    setCaptureDraft('')
  }

  const writingCaptures = useMemo(
    () => captures.filter((capture) => capture.tag === 'writing'),
    [captures],
  )

  const splitByBook = (book: string) =>
    chapters.filter((chapter) => chapter.book === book)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-night-400">
          Writing Hub
        </p>
        <h2 className="text-2xl font-semibold text-white">Books + Substack</h2>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {[bookOne, bookTwo].map((book) => (
          <div
            key={book}
            className="rounded-2xl border border-night-700 bg-night-900/70 p-5"
          >
            <h3 className="text-sm font-semibold text-white">{book}</h3>
            <div className="mt-4 space-y-3">
              {splitByBook(book).map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-night-700 bg-night-950/70 px-3 py-2 text-xs"
                >
                  <span className="text-night-300">
                    {chapter.chapter_number}. {chapter.title}
                  </span>
                  <select
                    className="rounded-md border border-night-700 bg-night-900 px-2 py-1 text-xs text-white"
                    value={chapter.status}
                    onChange={(event) =>
                      updateChapter(chapter.id, {
                        status: event.target.value as Chapter['status'],
                      })
                    }
                  >
                    {['not started', 'drafted', 'edited', 'done'].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    className="flex-1 rounded-md border border-night-700 bg-night-900 px-2 py-1 text-xs text-white"
                    value={chapter.notes}
                    onChange={(event) =>
                      updateChapter(chapter.id, { notes: event.target.value })
                    }
                    placeholder="Notes"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Substack queue</h3>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              placeholder="Title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              placeholder="Publication"
              value={draft.publication}
              onChange={(event) =>
                setDraft({ ...draft, publication: event.target.value })
              }
            />
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              placeholder="Draft link"
              value={draft.draft_link}
              onChange={(event) =>
                setDraft({ ...draft, draft_link: event.target.value })
              }
            />
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              type="date"
              value={draft.publish_date}
              onChange={(event) =>
                setDraft({ ...draft, publish_date: event.target.value })
              }
            />
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              placeholder="Notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
            <button
              className="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950"
              onClick={addDraft}
            >
              Add draft
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {drafts.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-night-700 bg-night-950/70 p-3"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-night-300">
                  {item.publication || 'Substack'} ·{' '}
                  {item.publish_date ? formatDate(item.publish_date) : 'No date'}
                </p>
                <p className="text-xs text-night-400">{item.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Writing sessions</h3>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              type="date"
              value={sessionDraft.date}
              onChange={(event) =>
                setSessionDraft({ ...sessionDraft, date: event.target.value })
              }
            />
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              type="number"
              placeholder="Word count"
              value={sessionDraft.word_count || ''}
              onChange={(event) =>
                setSessionDraft({
                  ...sessionDraft,
                  word_count: Number(event.target.value),
                })
              }
            />
            <input
              className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              placeholder="Notes"
              value={sessionDraft.notes}
              onChange={(event) =>
                setSessionDraft({ ...sessionDraft, notes: event.target.value })
              }
            />
            <button
              className="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950"
              onClick={addSession}
            >
              Log session
            </button>
          </div>
          <div className="mt-4 space-y-2 text-sm text-night-300">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-lg border border-night-700 bg-night-950/70 p-3"
              >
                <p className="text-sm text-white">
                  {formatDate(session.date)} · {session.word_count} words
                </p>
                <p className="text-xs text-night-400">{session.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Raw writing</h3>
          <textarea
            className="mt-4 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            rows={5}
            placeholder="Capture a raw thought, line, or paragraph..."
            value={captureDraft}
            onChange={(event) => setCaptureDraft(event.target.value)}
          />
          <button
            className="mt-3 w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950"
            onClick={addCapture}
          >
            Save capture
          </button>
          <div className="mt-4 space-y-2 text-xs text-night-300">
            {writingCaptures.map((capture) => (
              <div
                key={capture.id}
                className="rounded-lg border border-night-700 bg-night-950/70 p-3"
              >
                <p className="text-[11px] text-night-400">
                  {new Date(capture.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-white">{capture.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
