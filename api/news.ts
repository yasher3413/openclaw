import type { VercelRequest, VercelResponse } from '@vercel/node'

const systemPrompt =
  'Return strict JSON only. No markdown. No backticks. No commentary.'

const buildUserPrompt = (sources: Record<string, string[]>) => `You are given URLs from Exa search for the last 24 hours.
Summarize into strict JSON with this shape:
{
  "bigTech": [{ "headline": "", "summary": "", "source": "", "url": "" }],
  "startups": [{ "headline": "", "summary": "", "source": "", "url": "" }],
  "world": [{ "headline": "", "summary": "", "source": "", "url": "" }]
}

Rules:
- Use only the URLs provided.
- Provide exactly 5 items per section.
- "source" should be the publication name.
- Keep summaries to one line.

bigTech URLs:
${sources.bigTech.join('\n')}

startups URLs:
${sources.startups.join('\n')}

world URLs:
${sources.world.join('\n')}`

const exaSearch = async (query: string, apiKey: string) => {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      numResults: 5,
      type: 'neural',
      useAutoprompt: true,
      startPublishedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }
  const data = await response.json()
  return (data?.results ?? []).map((item: { url: string }) => item.url)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  const exaKey = process.env.EXA_API_KEY
  if (!apiKey || !exaKey) {
    res.status(500).json({ error: 'Missing OPENAI_API_KEY or EXA_API_KEY' })
    return
  }

  let sources: Record<string, string[]>
  try {
    const [bigTech, startups, world] = await Promise.all([
      exaSearch(
        'Apple Google Meta Microsoft Amazon OpenAI Anthropic Nvidia news last 24 hours',
        exaKey,
      ),
      exaSearch(
        'startup funding round launch acquisition shutdown founder story last 24 hours TechCrunch Crunchbase The Information',
        exaKey,
      ),
      exaSearch('world news geopolitics economy Reuters AP BBC last 24 hours', exaKey),
    ])
    sources = { bigTech, startups, world }
  } catch (error) {
    res.status(500).json({ error: 'Exa search failed' })
    return
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      max_tokens: 1200,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: buildUserPrompt(sources),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    res.status(500).json({ error: errorText })
    return
  }

  const data = await response.json()
  const raw = data?.choices?.[0]?.message?.content ?? ''
  const jsonStart = raw.indexOf('{')
  const jsonText = jsonStart >= 0 ? raw.slice(jsonStart) : raw

  try {
    const parsed = JSON.parse(jsonText)
    res.status(200).json(parsed)
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse OpenAI response' })
  }
}
