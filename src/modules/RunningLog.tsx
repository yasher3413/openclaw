import type { User } from '@supabase/supabase-js'
import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { RunLog } from '../lib/types'
import {
  calcPace,
  createId,
  daysUntil,
  minutesToPace,
  startOfWeekKey,
  todayKey,
  upcomingRaceDate,
} from '../lib/utils'

type RunningLogProps = {
  user: User | null
}

const emptyRun: RunLog = {
  id: '',
  date: todayKey(),
  type: 'easy',
  distance_km: 0,
  duration_min: 0,
  pace_min_km: 0,
  feel: 3,
  notes: '',
}

export const RunningLog = ({ user }: RunningLogProps) => {
  const { rows: runs, setRows: setRuns } = useSupabaseTable<RunLog>(
    'runs',
    STORAGE_KEYS.runs,
    [],
    user,
  )
  const [draft, setDraft] = useState<RunLog>(emptyRun)

  const weeklyMileage = useMemo(() => {
    const weekKey = startOfWeekKey(new Date())
    return runs
      .filter((run) => run.date >= weekKey)
      .reduce((sum, run) => sum + (run.distance_km || 0), 0)
  }, [runs])

  const addRun = () => {
    const distance = Number(draft.distance_km)
    const duration = Number(draft.duration_min)
    if (!distance || !duration) return
    const pace = calcPace(distance, duration)
    setRuns([
      {
        ...draft,
        id: createId(),
        distance_km: distance,
        duration_min: duration,
        pace_min_km: pace,
        feel: Number(draft.feel),
      },
      ...runs,
    ])
    setDraft(emptyRun)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-night-400">
            Running Log
          </p>
          <h2 className="text-2xl font-semibold text-white">Training log</h2>
        </div>
        <div className="rounded-xl border border-night-700 bg-night-900/80 px-4 py-3 text-sm text-night-200">
          <p>Weekly mileage: {weeklyMileage.toFixed(1)} km</p>
          <p className="text-xs text-night-400">
            Race in {daysUntil(upcomingRaceDate())} days · Target 4:15/km
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
        <h3 className="text-sm font-semibold text-white">Log a run</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-6">
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            type="date"
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
          <select
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            value={draft.type}
            onChange={(event) =>
              setDraft({ ...draft, type: event.target.value as RunLog['type'] })
            }
          >
            {['easy', 'tempo', 'long', 'race', 'rest'].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            type="number"
            placeholder="km"
            value={draft.distance_km || ''}
            onChange={(event) =>
              setDraft({ ...draft, distance_km: Number(event.target.value) })
            }
          />
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            type="number"
            placeholder="mins"
            value={draft.duration_min || ''}
            onChange={(event) =>
              setDraft({ ...draft, duration_min: Number(event.target.value) })
            }
          />
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
            type="number"
            placeholder="feel 1-5"
            value={draft.feel}
            onChange={(event) =>
              setDraft({ ...draft, feel: Number(event.target.value) })
            }
          />
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white lg:col-span-6"
            placeholder="Notes"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
        </div>
        <button
          className="mt-4 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950"
          onClick={addRun}
        >
          Add run
        </button>
      </section>

      <section className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">Run history</h3>
          <p className="text-xs text-night-400">
            PR: Half marathon 2:03:56
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="grid gap-2 rounded-lg border border-night-700 bg-night-950/70 p-3 text-xs text-night-200 md:grid-cols-6"
            >
              <span>{run.date}</span>
              <span className="uppercase text-accent-300">{run.type}</span>
              <span>{run.distance_km} km</span>
              <span>{run.duration_min} min</span>
              <span>
                {run.pace_min_km
                  ? `${minutesToPace(run.pace_min_km)} / km`
                  : '—'}
              </span>
              <span>Feel {run.feel}/5</span>
              {run.notes ? (
                <span className="md:col-span-6 text-night-400">{run.notes}</span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
