import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

const SENTIMENT_LABELS: Record<string, string> = {
  attack: 'Attack', policy: 'Policy', grievance: 'Grievance',
  procedural: 'Procedural', supportive: 'Supportive', mixed: 'Mixed',
}

export default function ContributionCard({ contribution: c }: { contribution: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="intel-card rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>{c.parliament_date}</span>
          {c.contribution_type && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid var(--intel-border)' }}>
              {c.contribution_type}
            </span>
          )}
          {c.ai_sentiment && (
            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-mono', `badge-${c.ai_sentiment}`)}>
              {SENTIMENT_LABELS[c.ai_sentiment] || c.ai_sentiment}
            </span>
          )}
          {c.has_potential_contradiction && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-mono badge-attack">
              <AlertTriangle size={10} /> Contradiction
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 transition-colors ml-2">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {c.ai_summary ? (
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#b0b0c0' }}>{c.ai_summary}</p>
      ) : (
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#7a7a8c' }}>{c.raw_text?.slice(0, 200)}...</p>
      )}

      {c.ai_topics?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {c.ai_topics.slice(0, 4).map((t: string) => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--intel-gold-dim)', color: 'var(--intel-gold)', border: '1px solid rgba(201,168,76,0.15)' }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {c.ai_attack_target && (
        <div className="text-xs font-mono mb-2" style={{ color: 'var(--intel-red)' }}>
          → Target: {c.ai_attack_target}
        </div>
      )}

      {expanded && (
        <div className="border-t pt-3 mt-2 space-y-3" style={{ borderColor: 'var(--intel-border)' }}>
          {c.ai_notable_quotes?.length > 0 && (
            <div>
              <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--intel-muted)' }}>NOTABLE QUOTES</div>
              {c.ai_notable_quotes.map((q: string, i: number) => (
                <blockquote key={i} className="text-sm italic pl-3 mb-1" style={{ borderLeft: '2px solid var(--intel-gold)', color: '#c0c0d0' }}>
                  "{q}"
                </blockquote>
              ))}
            </div>
          )}
          {c.debate_title && (
            <div className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>
              DEBATE: <span style={{ color: '#9ca3af' }}>{c.debate_title}</span>
            </div>
          )}
          <div>
            <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--intel-muted)' }}>FULL TEXT</div>
            <p className="text-xs leading-relaxed" style={{ color: '#7a7a8c', maxHeight: '200px', overflowY: 'auto' }}>
              {c.raw_text}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
