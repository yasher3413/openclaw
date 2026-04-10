import type { VercelRequest, VercelResponse } from '@vercel/node'

const systemPrompt =
  'Return strict JSON only. No markdown. No backticks. No commentary.'

const userPrompt = `Pull fresh news from the last 24 hours using web search.
Return strict JSON with this shape:
{
  "bigTech": [{ "headline": "", "summary": "", "source": "", "url": "" }],
  "startups": [{ "headline": "", "summary": "", "source": "", "url": "" }],
  "world": [{ "headline": "", "summary": "", "source": "", "url": "" }]
}

Sections:
- bigTech: Apple, Google, Meta, Microsoft, Amazon, OpenAI, Anthropic, Nvidia.
- startups: funding rounds, launches, acquisitions, shutdowns, founder stories.
- world: geopolitics, economy, major global events.

Provide exactly 5 items per section.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing CLAUDE_API_KEY' })
    return
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      tools: [
        {
          name: 'web_search',
          type: 'web_search_20250304',
        },
      ],
      tool_choice: { type: 'auto' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    res.status(500).json({ error: errorText })
    return
  }

  const data = await response.json()
  const textBlock = Array.isArray(data?.content)
    ? data.content.find((item: { type: string }) => item.type === 'text')
    : null
  const raw = textBlock?.text ?? ''
  const jsonStart = raw.indexOf('{')
  const jsonText = jsonStart >= 0 ? raw.slice(jsonStart) : raw

  try {
    const parsed = JSON.parse(jsonText)
    res.status(200).json(parsed)
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse Claude response' })
  }
}
