export const STORAGE_KEYS = {
  projects: 'openclaw_projects',
  runs: 'openclaw_runs',
  macros: 'openclaw_macros',
  dailyLogs: 'openclaw_daily_logs',
  writingSessions: 'openclaw_writing_sessions',
  chapters: 'openclaw_chapters',
  substackDrafts: 'openclaw_substack_drafts',
  learningPhases: 'openclaw_learning_phases',
  travelLegs: 'openclaw_travel_legs',
  captures: 'openclaw_captures',
  newsCache: 'openclaw_news_cache',
  syncQueue: 'openclaw_sync_queue',
} as const

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T) {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  },
}
