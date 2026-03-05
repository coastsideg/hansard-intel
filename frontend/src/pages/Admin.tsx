import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi, digestApi } from '../lib/api'
import { Play, RefreshCw, Users, Database, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any }> = {
    complete: { color: 'var(--intel-green)', icon: CheckCircle },
    error: { color: 'var(--intel-red)', icon: AlertCircle },
    pending: { color: 'var(--intel-gold)', icon: Clock },
    processing: { color: 'var(--intel-blue)', icon: RefreshCw },
  }
  const c = map[status] || map.pending
  const Icon = c.icon
  return (
    <span className="flex items-center gap-1 text-xs font-mono" style={{ color: c.color }}>
      <Icon size={11} />
      {status}
    </span>
  )
}

export default function Admin() {
  const [fromYear, setFromYear] = useState(2017)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => setLog((l) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l].slice(0, 50))

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['admin-status'],
    queryFn: () => adminApi.status().then((r) => r.data),
    refetchInterval: 10000,
  })

  const seedMutation = useMutation({
    mutationFn: () => adminApi.seedMembers(),
    onSuccess: () => addLog('✓ Known members seeded successfully'),
    onError: () => addLog('✗ Seed members failed'),
  })

  const historicalMutation = useMutation({
    mutationFn: () => {
      addLog(`Starting historical scrape from ${fromYear}...`)
      return adminApi.historicalScrape(fromYear)
    },
    onSuccess: () => addLog('✓ Historical scrape job started in background'),
    onError: (e: any) => addLog(`✗ Historical scrape failed: ${e.message}`),
  })

  const dailyMutation = useMutation({
    mutationFn: () => {
      addLog('Starting daily scrape...')
      return adminApi.dailyScrape()
    },
    onSuccess: () => addLog('✓ Daily scrape started'),
    onError: () => addLog('✗ Daily scrape failed'),
  })

  const digestMutation = useMutation({
    mutationFn: () => {
      addLog('Generating daily digest...')
      return digestApi.generate()
    },
    onSuccess: () => addLog('✓ Digest generated'),
    onError: () => addLog('✗ Digest generation failed'),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
          ADMIN
        </h1>
        <div className="text-xs font-mono mt-1" style={{ color: 'var(--intel-muted)' }}>
          System management — scraping, ingestion, status
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database size={14} style={{ color: 'var(--intel-muted)' }} />
              <h2 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>SYSTEM STATUS</h2>
            </div>
            <button onClick={() => refetchStatus()} className="text-xs font-mono px-2 py-1 rounded transition-all"
              style={{ color: 'var(--intel-muted)', border: '1px solid var(--intel-border)' }}>
              <RefreshCw size={11} className="inline mr-1" />Refresh
            </button>
          </div>
          <div className="intel-card rounded-lg p-4 space-y-3">
            {status ? (
              <>
                <div>
                  <div className="text-xs font-mono mb-2" style={{ color: 'var(--intel-muted)' }}>HANSARD SOURCES</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(status.sources).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center">
                        <StatusBadge status={k} />
                        <span className="text-sm font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--intel-border)' }}>
                  <div className="text-xs font-mono mb-2" style={{ color: 'var(--intel-muted)' }}>CONTRIBUTIONS</div>
                  <div className="flex justify-between">
                    <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>Total</span>
                    <span className="text-sm font-mono">{status.contributions.total?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>AI Processed</span>
                    <span className="text-sm font-mono" style={{ color: 'var(--intel-green)' }}>{status.contributions.ai_processed?.toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-center py-4" style={{ color: 'var(--intel-muted)' }}>Loading...</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Seed Members */}
          <div className="intel-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: 'var(--intel-gold)' }} />
              <h3 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>SEED KNOWN MEMBERS</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--intel-muted)' }}>
              Populate database with known WA opposition members. Run this first.
            </p>
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all"
              style={{ background: 'var(--intel-gold-dim)', color: 'var(--intel-gold)', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              <Play size={13} />
              {seedMutation.isPending ? 'Running...' : 'Seed Members'}
            </button>
          </div>

          {/* Historical Scrape */}
          <div className="intel-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} style={{ color: 'var(--intel-blue)' }} />
              <h3 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>HISTORICAL SCRAPE</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--intel-muted)' }}>
              Download all Hansard PDFs from the specified year onwards. This runs in the background and may take hours.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                className="px-3 py-2 rounded text-xs font-mono outline-none"
                style={{ background: 'var(--intel-black)', border: '1px solid var(--intel-border)', color: '#e8e8f0' }}
              >
                {Array.from({ length: 9 }, (_, i) => 2017 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => historicalMutation.mutate()}
                disabled={historicalMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all"
                style={{ background: 'rgba(74,144,217,0.15)', color: 'var(--intel-blue)', border: '1px solid rgba(74,144,217,0.3)' }}
              >
                <Play size={13} />
                {historicalMutation.isPending ? 'Starting...' : 'Start Scrape'}
              </button>
            </div>
          </div>

          {/* Daily Scrape */}
          <div className="intel-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={14} style={{ color: 'var(--intel-green)' }} />
              <h3 className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>DAILY SCRAPE</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--intel-muted)' }}>
              Check last 7 days for new PDFs. Runs automatically at 6am AWST daily.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => dailyMutation.mutate()}
                disabled={dailyMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all"
                style={{ background: 'rgba(42,157,92,0.15)', color: 'var(--intel-green)', border: '1px solid rgba(42,157,92,0.3)' }}
              >
                <Play size={13} />
                Run Now
              </button>
              <button
                onClick={() => digestMutation.mutate()}
                disabled={digestMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all"
                style={{ background: 'var(--intel-gold-dim)', color: 'var(--intel-gold)', border: '1px solid rgba(201,168,76,0.3)' }}
              >
                <Calendar size={13} />
                Generate Digest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      {log.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-mono tracking-widest mb-3" style={{ color: 'var(--intel-muted)' }}>ACTIVITY LOG</h2>
          <div className="intel-card rounded-lg p-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {log.map((l, i) => (
              <div key={i} className="text-xs font-mono mb-1" style={{ color: l.includes('✓') ? 'var(--intel-green)' : l.includes('✗') ? 'var(--intel-red)' : 'var(--intel-muted)' }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
