import type { User } from '@supabase/supabase-js'
import { useMemo, useState } from 'react'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { DailyLog, MacroEntry, RunLog } from '../lib/types'
import {
  calcPace,
  createId,
  daysUntil,
  formatDay,
  minutesToPace,
  startOfWeekKey,
  todayKey,
  upcomingRaceDate,
} from '../lib/utils'
import { useDailyNews } from '../lib/news'

const defaultDailyLog = (): DailyLog => ({
  id: createId(),
  date: todayKey(),
  gym_done: false,
  macros_logged: false,
  run_logged: false,
  focus: '',
})

const defaultMacroEntry = (): MacroEntry => ({
  id: createId(),
  date: todayKey(),
  body_weight_goal_kg: 70,
  protein_g: 0,
  carbs_g: 0,
  fats_g: 0,
})

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

type DashboardProps = {
  user: User | null
}

export const Dashboard = ({ user }: DashboardProps) => {
  const { rows: runs, setRows: setRuns } = useSupabaseTable<RunLog>(
    'runs',
    STORAGE_KEYS.runs,
    [],
    user,
  )
  const { rows: macros, setRows: setMacros } = useSupabaseTable<MacroEntry>(
    'macros',
    STORAGE_KEYS.macros,
    [],
    user,
  )
  const { rows: dailyLogs, setRows: setDailyLogs } = useSupabaseTable<DailyLog>(
    'daily_logs',
    STORAGE_KEYS.dailyLogs,
    [],
    user,
  )
  const { news, timestamp, loading } = useDailyNews()
  const [runDraft, setRunDraft] = useState<RunLog>(emptyRun)

  const today = todayKey()
  const dailyLog = dailyLogs.find((log) => log.date === today) ?? defaultDailyLog()
  const macroEntry = macros.find((entry) => entry.date === today) ?? defaultMacroEntry()

  const weeklyMileage = useMemo(() => {
    const weekKey = startOfWeekKey(new Date())
    return runs
      .filter((run) => run.date >= weekKey)
      .reduce((sum, run) => sum + (run.distance_km || 0), 0)
  }, [runs])

  const lastFourWeeks = useMemo(() => {
    const result: { week: string; miles: number }[] = []
    const now = new Date()
    for (let index = 0; index < 4; index += 1) {
      const date = new Date(now)
      date.setDate(date.getDate() - index * 7)
      const key = startOfWeekKey(date)
      const weekStart = new Date(key)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const weekEndKey = weekEnd.toISOString().slice(0, 10)
      const miles = runs
        .filter((run) => run.date >= key && run.date < weekEndKey)
        .reduce((sum, run) => sum + (run.distance_km || 0), 0)
      result.unshift({ week: key, miles })
    }
    return result
  }, [runs])

  const handleDailyLogChange = (updates: Partial<DailyLog>) => {
    const nextLog = { ...dailyLog, ...updates }
    const nextLogs = dailyLogs.filter((log) => log.date !== today)
    nextLogs.push(nextLog)
    setDailyLogs(nextLogs)
  }

  const handleMacroChange = (updates: Partial<MacroEntry>) => {
    const nextEntry = { ...macroEntry, ...updates }
    const nextEntries = macros.filter((entry) => entry.date !== today)
    nextEntries.push(nextEntry)
    setMacros(nextEntries)
  }

  const saveRun = () => {
    const distance = Number(runDraft.distance_km)
    const duration = Number(runDraft.duration_min)
    if (!distance || !duration) return
    const pace = calcPace(distance, duration)
    const newRun: RunLog = {
      ...runDraft,
      id: createId(),
      date: runDraft.date || today,
      pace_min_km: pace,
      distance_km: distance,
      duration_min: duration,
      feel: Number(runDraft.feel),
    }
    setRuns([newRun, ...runs])
    handleDailyLogChange({ run_logged: true })
    setRunDraft({ ...emptyRun, date: today })
  }

  const proteinTarget = Math.round(macroEntry.body_weight_goal_kg * 2.2)
  const fatsTarget = Math.round(macroEntry.body_weight_goal_kg * 0.8)
  const carbsTarget = Math.round(macroEntry.body_weight_goal_kg * 3)
  const raceDays = daysUntil(upcomingRaceDate())

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-night-400">
            Daily Dashboard
          </p>
          <h2 className="text-2xl font-semibold text-white">{formatDay()}</h2>
        </div>
        <div className="rounded-xl border border-night-700 bg-night-900/80 px-4 py-3">
          <p className="text-xs text-night-400">Race countdown</p>
          <p className="text-lg font-semibold text-accent-300">
            {raceDays} days to Toronto TCS Marathon
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Morning checklist</h3>
          <div className="mt-4 space-y-3 text-sm text-night-200">
            {[
              { key: 'gym_done', label: 'Gym done?' },
              { key: 'macros_logged', label: 'Macros logged?' },
              { key: 'run_logged', label: 'Run logged?' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={dailyLog[item.key as keyof DailyLog] as boolean}
                  onChange={(event) =>
                    handleDailyLogChange({ [item.key]: event.target.checked })
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-night-400">
              Current focus
            </p>
            <input
              className="mt-2 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
              placeholder="What are you locked in on?"
              value={dailyLog.focus}
              onChange={(event) => handleDailyLogChange({ focus: event.target.value })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Macro tracker</h3>
          <p className="mt-2 text-xs text-night-400">
            Auto targets from body weight goal (protein first).
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            <label className="text-night-300">
              Body weight goal (kg)
              <input
                className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-white focus:border-accent-400 focus:outline-none"
                type="number"
                value={macroEntry.body_weight_goal_kg}
                onChange={(event) =>
                  handleMacroChange({
                    body_weight_goal_kg: Number(event.target.value),
                  })
                }
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Protein',
                  value: macroEntry.protein_g,
                  target: proteinTarget,
                  key: 'protein_g',
                },
                {
                  label: 'Carbs',
                  value: macroEntry.carbs_g,
                  target: carbsTarget,
                  key: 'carbs_g',
                },
                {
                  label: 'Fats',
                  value: macroEntry.fats_g,
                  target: fatsTarget,
                  key: 'fats_g',
                },
              ].map((macro) => (
                <label key={macro.key} className="text-xs text-night-300">
                  {macro.label}
                  <input
                    className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-2 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
                    type="number"
                    value={macro.value}
                    onChange={(event) =>
                      handleMacroChange({
                        [macro.key]: Number(event.target.value),
                      })
                    }
                  />
                  <span className="mt-1 block text-[11px] text-night-500">
                    Target {macro.target}g
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-night-700 bg-night-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Marathon snapshot</h3>
          <p className="mt-2 text-xs text-night-400">
            Weekly mileage: {weeklyMileage.toFixed(1)} km
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-xs text-white focus:border-accent-400 focus:outline-none"
                type="date"
                value={runDraft.date}
                onChange={(event) =>
                  setRunDraft((prev) => ({ ...prev, date: event.target.value }))
                }
              />
              <select
                className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-xs text-white focus:border-accent-400 focus:outline-none"
                value={runDraft.type}
                onChange={(event) =>
                  setRunDraft((prev) => ({
                    ...prev,
                    type: event.target.value as RunLog['type'],
                  }))
                }
              >
                {['easy', 'tempo', 'long', 'race', 'rest'].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-xs text-white focus:border-accent-400 focus:outline-none"
                type="number"
                placeholder="km"
                value={runDraft.distance_km || ''}
                onChange={(event) =>
                  setRunDraft((prev) => ({
                    ...prev,
                    distance_km: Number(event.target.value),
                  }))
                }
              />
              <input
                className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-xs text-white focus:border-accent-400 focus:outline-none"
                type="number"
                placeholder="mins"
                value={runDraft.duration_min || ''}
                onChange={(event) =>
                  setRunDraft((prev) => ({
                    ...prev,
                    duration_min: Number(event.target.value),
                  }))
                }
              />
              <input
                className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-xs text-white focus:border-accent-400 focus:outline-none"
                type="number"
                placeholder="feel 1-5"
                value={runDraft.feel}
                onChange={(event) =>
                  setRunDraft((prev) => ({
                    ...prev,
                    feel: Number(event.target.value),
                  }))
                }
              />
            </div>
            <input
              className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-xs text-white focus:border-accent-400 focus:outline-none"
              placeholder="Notes"
              value={runDraft.notes}
              onChange={(event) =>
                setRunDraft((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
            <button
              className="rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-night-950"
              onClick={saveRun}
            >
              Log run
            </button>
          </div>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-night-400">
              Last 4 weeks
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {lastFourWeeks.map((week) => (
                <div key={week.week} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-md bg-accent-500/40"
                    style={{
                      height: `${Math.max(8, week.miles * 4)}px`,
                    }}
                  />
                  <span className="text-[10px] text-night-400">
                    {week.miles.toFixed(0)} km
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-night-400">
              Target pace (sub-3:00): 4:15/km · Latest pace:{' '}
              {runs[0]?.pace_min_km
                ? `${minutesToPace(runs[0]?.pace_min_km)} / km`
                : '—'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-night-700 bg-night-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Morning News Brief
            </h3>
            <p className="text-xs text-night-400">
              {timestamp
                ? `Last fetch: ${new Date(timestamp).toLocaleTimeString()}`
                : 'Pulling fresh headlines...'}
            </p>
          </div>
          <div className="text-xs text-night-400">
            {loading ? 'Fetching via OpenAI...' : 'Cached for today'}
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            { title: 'Big Tech', data: news?.bigTech ?? [] },
            { title: 'Startup News', data: news?.startups ?? [] },
            { title: 'World News', data: news?.world ?? [] },
          ].map((section) => (
            <div
              key={section.title}
              className="rounded-xl border border-night-700 bg-night-950/80 p-4"
            >
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
                {section.title}
              </h4>
              <div className="mt-3 space-y-3 text-sm text-night-200">
                {section.data.length ? (
                  section.data.map((item) => (
                    <a
                      key={item.headline}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-night-800 bg-night-900/70 p-3 hover:border-accent-400"
                    >
                      <p className="text-sm font-semibold text-white">
                        {item.headline}
                      </p>
                      <p className="mt-1 text-xs text-night-300">
                        {item.summary}
                      </p>
                      <p className="mt-2 text-[11px] text-accent-300">
                        {item.source}
                      </p>
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-night-400">
                    {loading ? 'Loading...' : 'No items yet.'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
