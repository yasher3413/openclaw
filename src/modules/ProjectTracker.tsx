import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { defaultProjects } from '../data/defaults'
import { useSupabaseTable } from '../lib/hooks'
import { STORAGE_KEYS } from '../lib/storage'
import type { Project, ProjectStatus } from '../lib/types'
import { createId } from '../lib/utils'

const statusOptions: ProjectStatus[] = [
  'not started',
  'in progress',
  'blocked',
  'done',
]

type ProjectTrackerProps = {
  user: User | null
}

export const ProjectTracker = ({ user }: ProjectTrackerProps) => {
  const { rows: projects, setRows: setProjects } = useSupabaseTable<Project>(
    'projects',
    STORAGE_KEYS.projects,
    defaultProjects,
    user,
  )
  const [draft, setDraft] = useState<Project>({
    id: '',
    title: '',
    status: 'not started',
    next_action: '',
    deadline: '',
    notes: '',
  })

  const updateProject = (id: string, updates: Partial<Project>) => {
    const next = projects.map((project) =>
      project.id === id ? { ...project, ...updates } : project,
    )
    setProjects(next)
  }

  const addProject = () => {
    if (!draft.title.trim()) return
    setProjects([{ ...draft, id: createId() }, ...projects])
    setDraft({
      id: '',
      title: '',
      status: 'not started',
      next_action: '',
      deadline: '',
      notes: '',
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-night-400">
          Project Tracker
        </p>
        <h2 className="text-2xl font-semibold text-white">Active projects</h2>
      </header>

      <div className="rounded-2xl border border-night-700 bg-night-900/70 p-6">
        <h3 className="text-sm font-semibold text-white">Add project</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none md:col-span-2"
            placeholder="Project title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <select
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value as ProjectStatus })
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
            type="date"
            value={draft.deadline}
            onChange={(event) => setDraft({ ...draft, deadline: event.target.value })}
          />
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none md:col-span-2"
            placeholder="Next action"
            value={draft.next_action}
            onChange={(event) =>
              setDraft({ ...draft, next_action: event.target.value })
            }
          />
          <input
            className="rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none md:col-span-2"
            placeholder="Notes"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
        </div>
        <button
          className="mt-4 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950"
          onClick={addProject}
        >
          Add project
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl border border-night-700 bg-night-900/70 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{project.title}</h3>
              <select
                className="rounded-lg border border-night-700 bg-night-950 px-2 py-1 text-xs text-white focus:border-accent-400 focus:outline-none"
                value={project.status}
                onChange={(event) =>
                  updateProject(project.id, {
                    status: event.target.value as ProjectStatus,
                  })
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 space-y-3 text-xs text-night-300">
              <label className="block">
                Next action
                <input
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
                  value={project.next_action}
                  onChange={(event) =>
                    updateProject(project.id, { next_action: event.target.value })
                  }
                />
              </label>
              <label className="block">
                Deadline
                <input
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
                  type="date"
                  value={project.deadline}
                  onChange={(event) =>
                    updateProject(project.id, { deadline: event.target.value })
                  }
                />
              </label>
              <label className="block">
                Notes
                <textarea
                  className="mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
                  rows={3}
                  value={project.notes}
                  onChange={(event) =>
                    updateProject(project.id, { notes: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
