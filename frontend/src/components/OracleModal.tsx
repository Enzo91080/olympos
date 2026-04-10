import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

interface Message {
  id: string
  role: 'user' | 'oracle'
  content: string
  loading?: boolean
}

const SUGGESTIONS = [
  'Comment construire un bon deck ?',
  'Quelle est la meilleure stratégie de début de partie ?',
  'Explique-moi Zeus, Roi des Dieux',
  'Comment fonctionne la summoning sickness ?',
]

export default function OracleModal({ onClose }: { onClose: () => void }) {
  const { token } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'oracle',
      content: "Je suis l'Oracle de l'Olympe. Posez-moi vos questions sur les règles, les cartes ou les stratégies d'Olympos: Card Clash.",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = async (question: string) => {
    if (!question.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question }
    const oracleMsg: Message = { id: Date.now().toString() + '_o', role: 'oracle', content: '', loading: true }

    setMessages((prev) => [...prev, userMsg, oracleMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/oracle/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.done) break
            if (parsed.token) {
              accumulated += parsed.token
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === oracleMsg.id ? { ...m, content: accumulated, loading: false } : m
                )
              )
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === oracleMsg.id
            ? {
                ...m,
                content: err.message?.includes('Ollama')
                  ? "L'Oracle est silencieux... Ollama n'est pas lancé. Exécute `ollama run gemma3:1b` dans un terminal."
                  : `L'Oracle ne peut répondre pour le moment : ${err.message}`,
                loading: false,
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-start"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-64 mb-0 w-[420px] h-[600px] flex flex-col bg-surface-container-lowest border border-outline-variant/20 shadow-2xl rounded-t-2xl z-10"
        style={{ marginLeft: '256px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container/40 border border-secondary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-primary text-sm tracking-widest uppercase">Oracle de l'Olympe</h3>
              <p className="text-[10px] text-on-surface-variant">IA locale — Ollama</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'oracle' && (
                <div className="w-7 h-7 rounded-full bg-secondary-container/40 border border-secondary/30 flex-shrink-0 flex items-center justify-center mt-1">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'oracle'
                  ? 'bg-surface-container-high text-on-surface rounded-tl-sm'
                  : 'bg-primary/20 border border-primary/30 text-primary rounded-tr-sm text-right'
                }`}
              >
                {msg.loading ? (
                  <span className="flex items-center gap-2 text-on-surface-variant">
                    <span className="animate-spin material-symbols-outlined text-sm">autorenew</span>
                    L'Oracle consulte les astres...
                  </span>
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="text-[10px] px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-outline-variant/20">
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask(input)}
              placeholder="Posez votre question à l'Oracle..."
              disabled={isLoading}
              className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => ask(input)}
              disabled={isLoading || !input.trim()}
              className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 hover:bg-primary-container transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-on-primary text-lg">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
