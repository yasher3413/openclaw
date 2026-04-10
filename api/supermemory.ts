import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing SUPERMEMORY_API_KEY' })
    return
  }

  const { content, tag, source } = req.body ?? {}
  if (!content) {
    res.status(400).json({ error: 'Missing content' })
    return
  }

  const response = await fetch('https://api.supermemory.ai/v1/memories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      content,
      tags: tag ? [tag] : [],
      source: source ?? 'openclaw',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    res.status(500).json({ error: errorText })
    return
  }

  const data = await response.json()
  res.status(200).json(data)
}
