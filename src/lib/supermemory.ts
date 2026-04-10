export const sendToSupermemory = async (
  content: string,
  tag: string,
  source: string,
) => {
  if (!content.trim()) return
  try {
    await fetch('/api/supermemory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tag, source }),
    })
  } catch (error) {
    console.error('Supermemory failed', error)
  }
}
