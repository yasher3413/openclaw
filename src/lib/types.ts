export type ProjectStatus = 'not started' | 'in progress' | 'blocked' | 'done'

export type Project = {
  id: string
  title: string
  status: ProjectStatus
  next_action: string
  deadline: string
  notes: string
}

export type RunLog = {
  id: string
  date: string
  type: 'easy' | 'tempo' | 'long' | 'race' | 'rest'
  distance_km: number
  duration_min: number
  pace_min_km: number
  feel: number
  notes: string
}

export type MacroEntry = {
  id: string
  date: string
  body_weight_goal_kg: number
  protein_g: number
  carbs_g: number
  fats_g: number
}

export type DailyLog = {
  id: string
  date: string
  gym_done: boolean
  macros_logged: boolean
  run_logged: boolean
  focus: string
}

export type WritingSession = {
  id: string
  date: string
  word_count: number
  notes: string
}

export type Chapter = {
  id: string
  book: string
  chapter_number: number
  title: string
  status: 'drafted' | 'edited' | 'done' | 'not started'
  notes: string
}

export type SubstackDraft = {
  id: string
  title: string
  publication: string
  draft_link: string
  publish_date: string
  notes: string
}

export type LearningPhase = {
  id: string
  title: string
  week_range: string
  status: 'not started' | 'in progress' | 'done'
  notes: string
  tasks: { id: string; text: string; done: boolean }[]
}

export type TravelLeg = {
  id: string
  leg: string
  dates: string
  accommodation: string
  budget_cad: number
  spent_cad: number
  todo: string
  packing: string
  visa_notes: string
}

export type Capture = {
  id: string
  created_at: string
  content: string
  tag: 'idea' | 'writing' | 'work' | 'fitness' | 'personal'
}
