import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { SectionHead } from '../components/ui/primitives'
import { askAssistant } from '../engine/assistant'
import { buildContext } from '../engine/context'
import { useLiveData } from '../services/LiveDataContext'
import { askGroqStream, groqAvailable, type ChatTurn } from '../services/groq'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string[]
  sources?: string[]
  suggestions?: string[]
}

const OPENING: ChatMessage = {
  role: 'assistant',
  text: [
    "Salam! I'm the AtlasKick Analyst — powered by Llama 3.3 on Groq, but grounded strictly in this platform's live data: fixtures, results, player leaderboards, model predictions and Monte Carlo simulations. I remember our conversation, and I won't answer anything outside the tournament.",
    'Ask me to compare teams, explain a prediction, or assess Morocco\'s road ahead.',
  ],
  suggestions: ["What are Morocco's chances against Canada?", 'Who leads the Golden Boot?', 'Who has the most saves?'],
}

// Session-scoped memory: a module-level store keeps the conversation while the
// app stays loaded (navigating away to another page and back preserves it),
// but a full page reload re-initializes the module → a fresh chat. This is
// exactly the "clear on reload, keep during the session" behaviour we want,
// so nothing is persisted to localStorage.
let sessionMessages: ChatMessage[] = [OPENING]

const SUGGESTION_POOL = [
  "What are Morocco's chances against Canada?",
  'Compare Portugal and Spain',
  'Who leads the Golden Boot?',
  'Who has the most saves?',
  'Which team is most likely to win the World Cup?',
  'What should Morocco improve before Canada?',
  'Which team has the best defense?',
]

const pickSuggestions = (lastQuery: string): string[] =>
  SUGGESTION_POOL.filter((s) => s.toLowerCase() !== lastQuery.toLowerCase()).slice(0, 3)

export default function Assistant() {
  const { fixtures } = useLiveData()
  const [messages, setMessages] = useState<ChatMessage[]>(sessionMessages)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const initialScrollSkips = useRef(0)

  useEffect(() => {
    if (initialScrollSkips.current < 2) {
      initialScrollSkips.current += 1
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  // Keep the session store in sync so in-app navigation preserves the chat.
  useEffect(() => {
    sessionMessages = messages
  }, [messages])

  const resetChat = () => {
    sessionMessages = [OPENING]
    setMessages([OPENING])
  }

  const send = async (q: string) => {
    const query = q.trim()
    if (!query || thinking) return
    setMessages((prev) => [...prev, { role: 'user', text: [query] }])
    setInput('')
    setThinking(true)

    // Retrieval first: assemble the grounded context from live tables.
    const { context, sources } = buildContext(query, fixtures)

    // Conversation memory: last turns, flattened for the LLM.
    const history: ChatTurn[] = messages
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.text.join('\n') }))

    try {
      if (!groqAvailable()) throw new Error('no key')
      // Streaming: a placeholder bubble fills in token by token.
      let started = false
      const splitParas = (s: string) => s.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
      const reply = await askGroqStream(history, query, context, (accumulated) => {
        setMessages((prev) => {
          const next = [...prev]
          const streamed: ChatMessage = { role: 'assistant', text: splitParas(accumulated) }
          if (!started) {
            next.push(streamed)
          } else {
            next[next.length - 1] = streamed
          }
          return next
        })
        if (!started) {
          started = true
          setThinking(false)
        }
      })
      // Finalize with sources + suggestions attached.
      setMessages((prev) => {
        const next = [...prev]
        const final: ChatMessage = { role: 'assistant', text: splitParas(reply), sources, suggestions: pickSuggestions(query) }
        if (started) next[next.length - 1] = final
        else next.push(final)
        return next
      })
    } catch {
      // LLM unreachable → deterministic rule-based analyst, same data.
      const answer = askAssistant(query, fixtures)
      setMessages((prev) => [...prev, { role: 'assistant', ...answer }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="page-backdrop">
        <img src="/img/assistant-bg.png" alt="" width="1280" height="720" loading="eager" />
      </div>
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col px-4 pt-28 pb-28 sm:px-5 sm:pt-32" style={{ minHeight: '100vh' }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead
          kicker="Grounded AI · Llama 3.3 on Groq"
          title="Ask the analyst"
          sub="Retrieval-first: every question is answered from the live analytics tables — fixtures, leaders, predictions, simulations — never from the model's imagination. Sources cited under each reply."
        />
        <button
          onClick={resetChat}
          className="mono min-h-11 cursor-pointer rounded-full border px-4 py-2 text-[0.62rem] tracking-[0.18em] uppercase transition-colors hover:border-[var(--ember)]"
          style={{ background: 'transparent', borderColor: 'var(--line-strong)', color: 'var(--muted)' }}
        >
          ⟲ New chat
        </button>
      </div>

      <div className="mt-8 flex-1 space-y-5 pb-24 sm:mt-10">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className="max-w-[88%] rounded-2xl px-4 py-3.5 sm:max-w-[85%] sm:px-5 sm:py-4"
                style={
                  m.role === 'user'
                    ? { background: 'var(--pitch-dim)', border: '1px solid rgba(242,182,60,0.32)', borderBottomRightRadius: 6 }
                    : { background: 'var(--surface-2)', border: '1px solid var(--line)', borderBottomLeftRadius: 6 }
                }
              >
                {m.role === 'assistant' && (
                  <div className="mono mb-2 text-[0.58rem] tracking-[0.24em] uppercase">
                    <span className="grad-text">AtlasKick Analyst</span>
                  </div>
                )}
                <div className="space-y-2">
                  {m.text.map((line, j) => (
                    <p key={j} className="m-0 text-[0.88rem] leading-relaxed whitespace-pre-line">
                      {line}
                    </p>
                  ))}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mono mt-3 flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <span key={s} className="rounded px-2 py-0.5 text-[0.58rem]" style={{ background: 'var(--surface)', color: 'var(--faint)', border: '1px solid var(--line)' }}>
                        ⌗ {s}
                      </span>
                    ))}
                  </div>
                )}
                {m.suggestions && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="min-h-11 cursor-pointer rounded-full border px-3 py-1.5 text-[0.7rem] transition-colors hover:border-[var(--ember)]"
                        style={{ background: 'transparent', borderColor: 'var(--line-strong)', color: 'var(--muted)' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 px-2">
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--ember)' }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ repeat: Infinity, duration: 1, delay: d * 0.18 }}
              />
            ))}
            <span className="mono ml-2 text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: 'var(--faint)' }}>
              retrieving live data · consulting Llama 3.3
            </span>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="fixed right-4 bottom-3 left-4 z-30 mx-auto flex max-w-3xl gap-2.5 sm:bottom-4 sm:gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Ask about any team, player, or probability…'
          className="min-w-0 flex-1 rounded-xl border px-4 py-3.5 text-[0.88rem] outline-none backdrop-blur-md transition-colors focus:border-[var(--ember)] sm:px-5"
          style={{ background: 'rgba(29,22,12,0.92)', borderColor: 'var(--line-strong)', color: 'var(--text)' }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.95 }}
          className="display grad-bg cursor-pointer rounded-xl border-0 px-5 text-lg tracking-wide sm:px-6"
        >
          Ask
        </motion.button>
      </form>
      </div>
    </div>
  )
}
