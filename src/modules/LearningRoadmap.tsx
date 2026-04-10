import type { User } from '@supabase/supabase-js'
import { defaultLearningPhases } from '../data/defaults'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { LearningPhase } from '../lib/types'

type LearningRoadmapProps = {
  user: User | null
}

export const LearningRoadmap = ({ user }: LearningRoadmapProps) => {
  const { rows: phases, setRows: setPhases } = useSupabaseTable<LearningPhase>(
    'learning_phases',
    STORAGE_KEYS.learningPhases,
    defaultLearningPhases,
    user,
  )

  const updatePhase = (id: string, updates: Partial<LearningPhase>) => {
    setPhases(
      phases.map((phase) => (phase.id === id ? { ...phase, ...updates } : phase)),
    )
  }

  const toggleTask = (phaseId: string, taskId: string) => {
    setPhases(
      phases.map((phase) => {
        if (phase.id !== phaseId) return phase
        return {
          ...phase,
          tasks: phase.tasks.map((task) =>
            task.id === taskId ? { ...task, done: !task.done } : task,
          ),
        }
      }),
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-night-400">
          Learning Roadmap
        </p>
        <h2 className="text-2xl font-semibold text-white">
          T-Mobile prep: 9-week sprint
        </h2>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="rounded-2xl border border-night-700 bg-night-900/70 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-night-400">
                  {phase.week_range}
                </p>
                <h3 className="text-sm font-semibold text-white">{phase.title}</h3>
              </div>
              <select
                className="rounded-lg border border-night-700 bg-night-950 px-2 py-1 text-xs text-white"
                value={phase.status}
                onChange={(event) =>
                  updatePhase(phase.id, {
                    status: event.target.value as LearningPhase['status'],
                  })
                }
              >
                {['not started', 'in progress', 'done'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 space-y-2 text-xs text-night-300">
              {phase.tasks.map((task) => (
                <label key={task.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(phase.id, task.id)}
                  />
                  <span>{task.text}</span>
                </label>
              ))}
            </div>
            <textarea
              className="mt-4 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white"
              rows={3}
              placeholder="Notes"
              value={phase.notes}
              onChange={(event) =>
                updatePhase(phase.id, { notes: event.target.value })
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}
