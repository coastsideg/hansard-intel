import { useQuery } from '@tanstack/react-query'
import { membersApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'

const PARTY_COLORS: Record<string, string> = {
  'Liberal': '#003087',
  'National': '#006633',
  'Greens': '#009B3A',
  'One Nation': '#FF6600',
  'Independent': '#888888',
}

export default function Members() {
  const navigate = useNavigate()
  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list().then((r) => r.data),
  })

  const byParty = members?.reduce((acc: any, m: any) => {
    if (!acc[m.party]) acc[m.party] = []
    acc[m.party].push(m)
    return acc
  }, {}) ?? {}

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
            MEMBERS
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--intel-muted)' }}>
            Opposition & crossbench · Both chambers
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: 'var(--intel-muted)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>
            {members?.length ?? 0} TRACKED
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--intel-muted)' }}>Loading members...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byParty).map(([party, partyMembers]: [string, any]) => (
            <div key={party}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[party] || '#888' }} />
                <h2 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>
                  {party.toUpperCase()} · {partyMembers.length} MEMBERS
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {partyMembers.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/members/${m.id}`)}
                    className="intel-card rounded-lg p-4 text-left w-full group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded flex items-center justify-center text-sm font-display font-bold flex-shrink-0"
                          style={{ background: `${PARTY_COLORS[party] || '#888'}22`, color: PARTY_COLORS[party] || '#888', border: `1px solid ${PARTY_COLORS[party] || '#888'}44` }}
                        >
                          {m.avatar_initials || m.full_name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{m.full_name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--intel-muted)' }}>
                            {m.electorate} · {m.chamber === 'Legislative Assembly' ? 'Assembly' : 'Council'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity mt-1" style={{ color: 'var(--intel-gold)' }} />
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--intel-border)' }}>
                      <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>
                        {m.total_contributions?.toLocaleString()} contributions
                      </span>
                      {m.role && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--intel-gold-dim)', color: 'var(--intel-gold)' }}>
                          {m.role.replace('Shadow ', '').slice(0, 20)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!Object.keys(byParty).length && (
            <div className="intel-card rounded-lg p-8 text-center">
              <p className="text-sm mb-2" style={{ color: 'var(--intel-muted)' }}>No members found.</p>
              <p className="text-xs" style={{ color: 'var(--intel-border)' }}>Go to Admin → Seed Members to populate known opposition members.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
