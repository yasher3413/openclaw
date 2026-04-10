import { useEffect, useState } from 'react'
import { STORAGE_KEYS, storage } from './storage'
import { todayKey } from './utils'

export type NewsItem = {
  headline: string
  summary: string
  source: string
  url: string
}

export type NewsPayload = {
  bigTech: NewsItem[]
  startups: NewsItem[]
  world: NewsItem[]
}

type CachedNews = {
  date: string
  timestamp: string
  payload: NewsPayload
}

export const useDailyNews = () => {
  const [news, setNews] = useState<NewsPayload | null>(null)
  const [timestamp, setTimestamp] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const cached = storage.get<CachedNews | null>(STORAGE_KEYS.newsCache, null)
    const today = todayKey()
    if (cached && cached.date === today) {
      setNews(cached.payload)
      setTimestamp(cached.timestamp)
      setLoading(false)
      return
    }

    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news')
        if (!response.ok) throw new Error('Failed')
        const payload = (await response.json()) as NewsPayload
        const stamp = new Date().toISOString()
        storage.set(STORAGE_KEYS.newsCache, {
          date: today,
          timestamp: stamp,
          payload,
        })
        setNews(payload)
        setTimestamp(stamp)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  return { news, timestamp, loading }
}
