import { useState, useRef, useEffect } from 'react'
import { chatApi } from '../lib/api'
import { Send, Hexagon, Loader2, ChevronRight, Copy, CheckCheck, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function buildGeminiHandoff(messages: Message[]): string {
  const date = new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const convo = messages
    .filter((m) => !m.loading)
    .map((m) => `${m.role === 'user' ? 'USER' : 'HANSARD INTEL'}: ${m.content}`)
    .join('\n\n')

  return `# HANSARD INTEL — Gemini Handoff
Date: ${date}
System: WA Parliament Opposition Research Platform — WA Labor Premier's Office

## YOUR ROLE
You are continuing as HANSARD INTEL, an opposition research and parliamentary intelligence assistant for the Western Australian Labor Party's Deputy Director of Stakeholder Engagement in the Premier's Office. You have deep knowledge of WA parliamentary proceedings, opposition members, and political strategy.

## CONTEXT
The user is a senior political operative in the WA Labor Premier's Office. They work with Hansard transcripts, opposition research, speech preparation, and QT briefings. Be analytical, precise, and politically astute. Always cite sources where possible.

## CONVERSATION SO FAR
${convo || '(No messages yet — user is starting fresh)'}

## INSTRUCTIONS
Continue the conversation from here. The user may paste new questions or requests below. Match the analytical tone of the previous responses. If asked about specific Hansard contributions, note that you don't have live database access in this session but can reason from the conversation context and your training knowledge of WA politics.`
}

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  confidence?: string
  follow_ups?: string[]
  searches?: string[]
  loading?: boolean
}

function SourceCard({ source, index }: { source: any; index: number }) {
  return (
    <div className="inline-block mr-2 mb-2 p-3 rounded text-xs cursor-pointer transition-all hover:border-opacity-60"
      style={{ background: 'var(--intel-dark)', border: '1px solid var(--intel-border)', minWidth: '140px', maxWidth: '180px', verticalAlign: 'top' }}>
      <div className="font-mono mb-1" style={{ color: 'var(--intel-gold)' }}>[{index}] {source.member_name}</div>
      <div className="mb-1" style={{ color: 'var(--intel-muted)' }}>{source.parliament_date}</div>
      {source.contribution_type && (
        <div className="mb-1.5" style={{ color: 'var(--intel-muted)' }}>{source.contribution_type}</div>
      )}
      <div className="leading-relaxed" style={{ color: '#9ca3af' }}>"{source.snippet?.slice(0, 80)}..."</div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence?: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: 'var(--intel-green)', bg: 'rgba(42,157,92,0.1)', label: 'High confidence' },
    medium: { color: 'var(--intel-gold)', bg: 'var(--intel-gold-dim)', label: 'Medium confidence' },
    low: { color: 'var(--intel-red)', bg: 'rgba(230,57,70,0.1)', label: 'Low confidence' },
    speculative: { color: 'var(--intel-muted)', bg: 'rgba(107,114,128,0.1)', label: 'Speculative' },
  }
  const c = map[confidence || 'medium'] || map.medium
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}44` }}>
      ● {c.label}
    </span>
  )
}

export default function Intelligence() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [copied, setCopied] = useState<string | null>(null)
  const [geminiCopied, setGeminiCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const exportToGemini = async () => {
    const handoff = buildGeminiHandoff(messages)
    await navigator.clipboard.writeText(handoff)
    setGeminiCopied(true)
    setTimeout(() => setGeminiCopied(false), 3000)
    window.open('https://gemini.google.com', '_blank')
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const loadingMsg: Message = { role: 'assistant', content: '', loading: true, searches: [] }
    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatApi.send(text, sessionId)
      const data = res.data
      if (!sessionId) setSessionId(data.session_id)

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: data.message_id,
          role: 'assistant',
          content: data.response,
          sources: data.sources,
          confidence: data.confidence,
          follow_ups: data.follow_ups,
          searches: data.searches_performed,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Error: Could not reach the intelligence API. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const SUGGESTED = [
    "What has David Honey said about energy in the last month?",
    "Brief me on this week's opposition attack lines",
    "Which opposition members have contradicted themselves on housing?",
    "What are the Liberals' key criticisms of the health system?",
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--intel-black)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--intel-border)' }}>
        <div className="flex items-center gap-2">
          <Hexagon size={16} style={{ color: 'var(--intel-gold)' }} strokeWidth={1.5} />
          <span className="font-display text-lg tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
            INTELLIGENCE
          </span>
          <span className="text-xs font-mono ml-2" style={{ color: 'var(--intel-muted)' }}>AI Research Assistant</span>
        </div>
        {sessionId && (
          <button onClick={() => { setMessages([]); setSessionId(undefined) }}
            className="text-xs font-mono px-3 py-1.5 rounded transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--intel-muted)', border: '1px solid var(--intel-border)' }}>
            New Session
          </button>
        )}
        <button
          onClick={exportToGemini}
          title="Copy conversation context and open Gemini — use when Claude usage limit is reached"
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded transition-all"
          style={{
            background: geminiCopied ? 'rgba(66,133,244,0.2)' : 'rgba(66,133,244,0.08)',
            color: geminiCopied ? '#4285f4' : '#6b8fd6',
            border: `1px solid ${geminiCopied ? 'rgba(66,133,244,0.5)' : 'rgba(66,133,244,0.2)'}`,
          }}
        >
          {geminiCopied ? <CheckCheck size={11} /> : <ExternalLink size={11} />}
          {geminiCopied ? 'Copied — paste into Gemini' : 'Handoff to Gemini'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Hexagon size={40} style={{ color: 'var(--intel-border)', margin: '0 auto 16px' }} strokeWidth={1} />
            <h2 className="font-display text-2xl mb-2 tracking-widest" style={{ color: 'var(--intel-muted)', letterSpacing: '0.2em' }}>
              HANSARD INTEL
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--intel-muted)' }}>
              Ask anything about opposition contributions, attack lines, and parliamentary intelligence.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded text-sm transition-all"
                  style={{ background: 'var(--intel-card)', border: '1px solid var(--intel-border)', color: '#b0b0c0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--intel-border)')}
                >
                  <ChevronRight size={12} className="inline mr-1.5 mb-0.5" style={{ color: 'var(--intel-gold)' }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            {msg.role === 'user' ? (
              <div className="max-w-lg px-4 py-3 rounded-lg text-sm"
                style={{ background: 'var(--intel-gold-dim)', border: '2px solid var(--intel-gold-dim)', color: '#e8e8f0', borderLeft: '3px solid var(--intel-gold)' }}>
                {msg.content}
              </div>
            ) : (
              <div className="max-w-4xl">
                <div className="flex items-center gap-2 mb-2">
                  <Hexagon size={12} style={{ color: 'var(--intel-gold)' }} strokeWidth={1.5} />
                  <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-gold)' }}>HANSARD INTEL</span>
                </div>

                {msg.loading ? (
                  <div className="intel-card rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--intel-muted)' }}>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="font-mono">Searching Hansard database...</span>
                    </div>
                  </div>
                ) : (
                  <div className="intel-card rounded-lg p-5">
                    <div className="prose prose-sm max-w-none mb-4"
                      style={{ color: '#c8c8d8', lineHeight: '1.7' }}>
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => <h2 className="font-display text-lg tracking-wide mb-3 mt-4" style={{ color: 'var(--intel-gold)' }}>{children}</h2>,
                          h3: ({ children }) => <h3 className="font-semibold mb-2 mt-3" style={{ color: '#e8e8f0' }}>{children}</h3>,
                          strong: ({ children }) => <strong style={{ color: '#e8e8f0' }}>{children}</strong>,
                          code: ({ children }) => <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--intel-gold)' }}>{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--intel-border)' }}>
                        <div className="text-xs font-mono mb-2" style={{ color: 'var(--intel-muted)' }}>SOURCES</div>
                        <div>{msg.sources.map((s, idx) => <SourceCard key={idx} source={s} index={s.index || idx + 1} />)}</div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 border-t pt-3" style={{ borderColor: 'var(--intel-border)' }}>
                      <ConfidenceBadge confidence={msg.confidence} />
                      {msg.id && (
                        <button onClick={() => copyMessage(msg.content, msg.id!)}
                          className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded transition-all"
                          style={{ color: 'var(--intel-muted)', border: '1px solid var(--intel-border)' }}>
                          {copied === msg.id ? <CheckCheck size={11} /> : <Copy size={11} />}
                          {copied === msg.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {/* Follow-ups */}
                    {msg.follow_ups && msg.follow_ups.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.follow_ups.map((q, idx) => (
                          <button key={idx} onClick={() => sendMessage(q)}
                            className="text-xs px-3 py-1.5 rounded transition-all"
                            style={{ background: 'var(--intel-dark)', border: '1px solid var(--intel-border)', color: '#b0b0c0' }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--intel-border)')}>
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--intel-border)' }}>
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Ask about opposition contributions, attack lines, contradictions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg text-sm outline-none transition-all"
            style={{
              background: 'var(--intel-card)',
              border: '1px solid var(--intel-border)',
              color: '#e8e8f0',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--intel-gold)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--intel-border)'}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-lg transition-all flex items-center gap-2"
            style={{
              background: loading || !input.trim() ? 'rgba(201,168,76,0.2)' : 'var(--intel-gold)',
              color: loading || !input.trim() ? 'rgba(201,168,76,0.4)' : '#0a0a0f',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
