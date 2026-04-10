import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from './components/Sidebar'
import { AuthPanel } from './components/AuthPanel'
import { Dashboard } from './modules/Dashboard'
import { ProjectTracker } from './modules/ProjectTracker'
import { WritingHub } from './modules/WritingHub'
import { LearningRoadmap } from './modules/LearningRoadmap'
import { TravelPlanner } from './modules/TravelPlanner'
import { RunningLog } from './modules/RunningLog'
import { QuickCapture } from './modules/QuickCapture'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { syncQueue } from './lib/sync'

const navItems = [
  {
    id: 'dashboard',
    label: 'Daily Dashboard',
    sublabel: 'Checklists, macros, news',
  },
  {
    id: 'projects',
    label: 'Project Tracker',
    sublabel: 'Active projects + next actions',
  },
  {
    id: 'writing',
    label: 'Writing Hub',
    sublabel: 'Books, Substack, word counts',
  },
  {
    id: 'learning',
    label: 'Learning Roadmap',
    sublabel: 'T-Mobile prep phases',
  },
  {
    id: 'travel',
    label: 'Travel Planner',
    sublabel: 'SEA trip legs + budget',
  },
  {
    id: 'running',
    label: 'Running Log',
    sublabel: 'Mileage and race countdown',
  },
  {
    id: 'capture',
    label: 'Quick Capture',
    sublabel: 'Inbox for fast notes',
  },
]

const renderModule = (active: string, user: User | null) => {
  switch (active) {
    case 'projects':
      return <ProjectTracker user={user} />
    case 'writing':
      return <WritingHub user={user} />
    case 'learning':
      return <LearningRoadmap user={user} />
    case 'travel':
      return <TravelPlanner user={user} />
    case 'running':
      return <RunningLog user={user} />
    case 'capture':
      return <QuickCapture user={user} />
    default:
      return <Dashboard user={user} />
  }
}

function App() {
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    syncQueue(supabase)
    const handleOnline = () => syncQueue(supabase)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [user])

  const module = useMemo(() => renderModule(active, user), [active, user])

  if (isSupabaseConfigured && !user) {
    return <AuthPanel />
  }

  return (
    <div className="min-h-screen bg-night-950 text-white">
      <Sidebar
        items={navItems}
        active={active}
        onSelect={(id) => {
          setActive(id)
          setSidebarOpen(false)
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        footer={
          <div className="rounded-lg border border-night-700 bg-night-950/80 p-3 text-xs text-night-300">
            <p>OpenClaw is offline-first.</p>
            <p className="text-night-500">
              {navigator.onLine ? 'Synced' : 'Offline mode'}
            </p>
          </div>
        }
      />
      <main className="min-h-screen bg-night-950 px-6 pb-12 pt-8 md:ml-72">
        <div className="mb-6 flex items-center justify-between">
          <button
            className="rounded-lg border border-night-700 bg-night-900 px-3 py-2 text-xs text-night-200 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            Menu
          </button>
          <div className="text-xs text-night-400">
            {isSupabaseConfigured
              ? 'Supabase connected'
              : 'Supabase env missing (local-only mode)'}
          </div>
        </div>
        {module}
      </main>
    </div>
  )
}

export default App
