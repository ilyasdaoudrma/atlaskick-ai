// Groq LLM client — the natural-language brain of the AtlasKick Analyst.
//
// Transport:
//  · Production — POSTs the prepared messages to /api/chat (the serverless Edge
//    proxy in api/chat.ts), which holds the key server-side. The browser never
//    sees a Groq key.
//  · Local dev — `vite` doesn't run the /api function, so when VITE_GROQ_API_KEY
//    is set the client calls Groq directly for convenience. That key is for your
//    machine only and is never shipped to a deployed build.
//
// The model NEVER answers from its own knowledge: every request carries a DATA
// CONTEXT block built from the live analytics tables, and the system prompt
// forbids answering outside it.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const PROXY_URL = '/api/chat'
const MODEL = 'llama-3.3-70b-versatile'
const DEV_KEY: string | undefined = import.meta.env.VITE_GROQ_API_KEY

// The proxy is always attempted in production; a local dev key just short-cuts
// straight to Groq. Either way the assistant has a rule-based fallback if the
// request fails, so this can safely return true.
export const groqAvailable = (): boolean => true

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are the AtlasKick Analyst — the in-app AI of AtlasKick, an explainable World Cup 2026 football intelligence platform with a special focus on Morocco (the Atlas Lions).

STRICT RULES — never break them:
1. Answer ONLY from the DATA CONTEXT block in the user message. Never invent scores, stats, players, fixtures or probabilities. Never use your training knowledge for facts.
2. If the context doesn't contain what's needed, say so plainly and suggest what you CAN answer.
3. If the question is not about football, World Cup 2026, or this platform, decline in one warm sentence and steer back to the tournament. No exceptions — no code, no general knowledge, no other sports.
4. Probabilities and expected goals come from the platform's model ensemble (Elo + Poisson + logistic); scores and results are real. Make that distinction when relevant.
5. Be concise: max ~150 words. Use the actual numbers from the context. Plain text only — no markdown headers, no bullets with asterisks; short paragraphs or simple numbered lines are fine.
6. Tone: sharp, warm, broadcast-analyst. A light Moroccan touch (an occasional "Dima Maghrib") is welcome when Morocco is the topic — never forced.`

const buildMessages = (history: ChatTurn[], userMessage: string, dataContext: string) => [
  { role: 'system', content: SYSTEM_PROMPT },
  ...history.slice(-10),
  { role: 'user', content: `DATA CONTEXT (live platform tables — your only source of truth):\n${dataContext}\n\nQUESTION: ${userMessage}` },
]

// Returns the streaming Response from whichever transport is active.
const openStream = async (messages: ReturnType<typeof buildMessages>): Promise<Response> => {
  if (DEV_KEY) {
    return fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEV_KEY}` },
      body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: 420, stream: true, messages }),
    })
  }
  return fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
}

// Streaming — calls onDelta with the accumulated text as tokens land, and
// resolves with the final reply. SSE format: lines of `data: {json}`.
export const askGroqStream = async (
  history: ChatTurn[],
  userMessage: string,
  dataContext: string,
  onDelta: (accumulated: string) => void,
): Promise<string> => {
  const res = await openStream(buildMessages(history, userMessage, dataContext))
  if (!res.ok || !res.body) throw new Error(`Groq: HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }
        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          onDelta(full)
        }
      } catch {
        // partial JSON split across chunks — ignored, buffer handles it
      }
    }
  }
  const reply = full.trim()
  if (!reply) throw new Error('Groq: empty stream')
  return reply
}
