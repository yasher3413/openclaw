export const createId = () => crypto.randomUUID()

export const todayKey = () => new Date().toISOString().slice(0, 10)

export const formatDate = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatDay = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

export const minutesToPace = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  const whole = Math.floor(minutes)
  const seconds = Math.round((minutes - whole) * 60)
  return `${whole}:${seconds.toString().padStart(2, '0')}`
}

export const calcPace = (distanceKm: number, durationMin: number) => {
  if (!distanceKm || !durationMin) return 0
  return Number((durationMin / distanceKm).toFixed(2))
}

export const startOfWeekKey = (date: Date) => {
  const copy = new Date(date)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  return copy.toISOString().slice(0, 10)
}

export const upcomingRaceDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  let race = new Date(`${year}-10-19T00:00:00`)
  if (race < now) {
    race = new Date(`${year + 1}-10-19T00:00:00`)
  }
  return race
}

export const daysUntil = (date: Date) => {
  const diff = date.getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
