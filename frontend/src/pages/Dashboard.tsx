import { useQuery } from '@tanstack/react-query'
import { contributionsApi, digestApi } from '../lib/api'
import { AlertTriangle, Swords, Users, FileText, TrendingUp, Calendar } from 'lucide-react'
import { format } from 'date-fns'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="intel-card rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono tracking-widest mb-1" style={{ color: 'var(--intel-muted)' }}>{label}</div>
          <div className="text-2xl font-display tracking-wide" style={{ color }}>{value?.toLocaleString?.() ?? value}</div>
        </div>
        <Icon size={18} style={{ color, opacity: 0.6 }} />
      </div>
    </div>
  )
}

function AttackCard({ item }: { item: any }) {
  return (
    <div className="intel-card rounded-lg p-4 cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--intel-red)' }}
          />
          <span className="text-sm font-medium">{item.member}</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(230,57,70,0.1)', color: 'var(--intel-red)', border: '1px solid rgba(230,57,70,0.2)' }}>
            {item.party}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>
          {item.date}
        </span>
      </div>
      <div className="text-xs mb-2 font-mono" style={{ color: 'var(--intel-gold)' }}>
        → {item.attack_target || item.type}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#b0b0c0' }}>{item.summary}</p>
    </div>
  )
}

export default function Dashboard() {
  const { data: overview } = useQuery({
    queryKey: ['overview'],
    queryFn: () => contributionsApi.overview().then((r) => r.data),
  })

  const { data: attacks } = useQuery({
    queryKey: ['recent-attacks'],
    queryFn: () => contributionsApi.recentAttacks(7).then((r) => r.data),
  })

  const { data: digest } = useQuery({
    queryKey: ['digest-latest'],
    queryFn: () => digestApi.latest().then((r) => r.data),
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
            DASHBOARD
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--intel-muted)' }}>
            {format(new Date(), 'EEEE d MMMM yyyy')} · WA Parliament Intelligence
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full intel-pulse" style={{ background: 'var(--intel-green)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>LIVE</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="CONTRIBUTIONS" value={overview?.total_contributions ?? '—'} icon={FileText} color="var(--intel-gold)" />
        <StatCard label="AI PROCESSED" value={overview?.ai_processed ?? '—'} icon={TrendingUp} color="var(--intel-blue)" />
        <StatCard label="CONTRADICTIONS" value={overview?.contradictions_flagged ?? '—'} icon={AlertTriangle} color="var(--intel-red)" />
        <StatCard label="ACTIVE MEMBERS" value={overview?.active_members ?? '—'} icon={Users} color="var(--intel-green)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent attacks */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Swords size={14} style={{ color: 'var(--intel-red)' }} />
            <h2 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>
              RECENT ATTACK LINES — LAST 7 DAYS
            </h2>
          </div>
          <div className="space-y-3">
            {attacks?.length ? (
              attacks.slice(0, 6).map((a: any) => <AttackCard key={a.id} item={a} />)
            ) : (
              <div className="intel-card rounded-lg p-6 text-center text-sm" style={{ color: 'var(--intel-muted)' }}>
                No attack contributions found. Run the scraper to populate data.
              </div>
            )}
          </div>
        </div>

        {/* Daily digest */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} style={{ color: 'var(--intel-gold)' }} />
            <h2 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>
              DAILY DIGEST
            </h2>
          </div>
          <div className="intel-card rounded-lg p-4">
            {digest?.summary ? (
              <>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#b0b0c0' }}>{digest.summary}</p>
                {digest.top_themes?.length && (
                  <div className="mb-4">
                    <div className="text-xs font-mono mb-2" style={{ color: 'var(--intel-muted)' }}>TOP THEMES</div>
                    <div className="flex flex-wrap gap-1.5">
                      {digest.top_themes.map((t: string) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{ background: 'var(--intel-gold-dim)', color: 'var(--intel-gold)', border: '1px solid rgba(201,168,76,0.2)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {digest.qt_prep_notes && (
                  <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--intel-border)' }}>
                    <div className="text-xs font-mono mb-1.5" style={{ color: 'var(--intel-red)' }}>QT PREP</div>
                    <p className="text-xs leading-relaxed" style={{ color: '#b0b0c0' }}>{digest.qt_prep_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm mb-2" style={{ color: 'var(--intel-muted)' }}>No digest generated yet</div>
                <p className="text-xs" style={{ color: 'var(--intel-border)' }}>Run the scraper and generate a digest from Admin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
