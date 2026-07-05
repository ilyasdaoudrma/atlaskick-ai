// Serverless Groq proxy (Vercel Edge Function).
//
// The browser never sees the Groq key: it POSTs the prepared `messages` here,
// this function injects the key server-side (from the GROQ_API_KEY env var) and
// streams Groq's response straight back. To stop the endpoint being abused as a
// free relay, the model and token cap are forced here and requests must come
// from an allowed origin.
//
// Deploy: set GROQ_API_KEY in the host's environment (Vercel/Netlify project
// settings). Locally, `npm run dev` skips this file and calls Groq directly with
// VITE_GROQ_API_KEY (see src/services/groq.ts).

export const config = { runtime: 'edge' }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'
const MAX_TOKENS = 500

interface ChatBody {
  messages?: { role: string; content: string }[]
}

const originAllowed = (req: Request): boolean => {
  const origin = req.headers.get('origin')
  if (!origin) return true // same-origin fetches often omit Origin
  const host = req.headers.get('host') ?? ''
  try {
    const o = new URL(origin)
    // Allow same host, any *.vercel.app preview, and localhost dev.
    return o.host === host || o.hostname.endsWith('.vercel.app') || o.hostname === 'localhost'
  } catch {
    return false
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!originAllowed(req)) return new Response('Forbidden', { status: 403 })

  const key = process.env.GROQ_API_KEY
  if (!key) return new Response('Groq not configured', { status: 503 })

  let body: ChatBody
  try {
    body = (await req.json()) as ChatBody
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-14) : []
  if (messages.length === 0) return new Response('No messages', { status: 400 })

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: MAX_TOKENS, stream: true, messages }),
  })

  if (!groqRes.ok || !groqRes.body) {
    return new Response('Upstream error', { status: 502 })
  }

  // Stream the SSE response straight through to the browser.
  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
