import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contributionsApi, membersApi } from '../lib/api'
import ContributionCard from '../components/ContributionCard'
import { Search, Filter, X } from 'lucide-react'

export default function Contributions() {
  const [search, setSearch] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [party, setParty] = useState('')
  const [type, setType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const params = {
    search: search || undefined,
    sentiment: sentiment || undefined,
    party: party || undefined,
    contribution_type: type || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    limit: 50,
  }

  const { data: contributions, isLoading } = useQuery({
    queryKey: ['contributions', params],
    queryFn: () => contributionsApi.list(params).then((r) => r.data),
  })

  const hasFilters = search || sentiment || party || type || fromDate || toDate
  const clearFilters = () => {
    setSearch(''); setSentiment(''); setParty(''); setType(''); setFromDate(''); setToDate('')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
            CONTRIBUTIONS
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--intel-muted)' }}>
            Search & filter all opposition Hansard contributions
          </div>
        </div>
        {contributions && (
          <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>
            {contributions.length} RESULTS
          </span>
        )}
      </div>

      {/* Search & filters */}
      <div className="intel-card rounded-lg p-4 mb-5 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--intel-muted)' }} />
          <input
            type="text"
            placeholder="Search contributions, summaries, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded text-sm outline-none"
            style={{ background: 'var(--intel-black)', border: '1px solid var(--intel-border)', color: '#e8e8f0' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--intel-gold)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--intel-border)'}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Sentiment', value: sentiment, setter: setSentiment, options: ['attack', 'policy', 'grievance', 'procedural', 'supportive', 'mixed'] },
            { label: 'Party', value: party, setter: setParty, options: ['Liberal', 'National', 'Greens', 'One Nation', 'Independent'] },
          ].map(({ label, value, setter, options }) => (
            <select
              key={label}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="px-3 py-2 rounded text-xs font-mono outline-none"
              style={{ background: 'var(--intel-black)', border: '1px solid var(--intel-border)', color: value ? '#e8e8f0' : 'var(--intel-muted)' }}
            >
              <option value="">{label}</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}

          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded text-xs font-mono outline-none"
            style={{ background: 'var(--intel-black)', border: '1px solid var(--intel-border)', color: fromDate ? '#e8e8f0' : 'var(--intel-muted)', colorScheme: 'dark' }} />

          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded text-xs font-mono outline-none"
            style={{ background: 'var(--intel-black)', border: '1px solid var(--intel-border)', color: toDate ? '#e8e8f0' : 'var(--intel-muted)', colorScheme: 'dark' }} />

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono transition-all"
              style={{ background: 'rgba(230,57,70,0.1)', color: 'var(--intel-red)', border: '1px solid rgba(230,57,70,0.2)' }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--intel-muted)' }}>Searching...</div>
      ) : (
        <div className="space-y-3">
          {contributions?.map((c: any) => <ContributionCard key={c.id} contribution={c} />)}
          {!contributions?.length && (
            <div className="intel-card rounded-lg p-8 text-center text-sm" style={{ color: 'var(--intel-muted)' }}>
              No contributions match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
