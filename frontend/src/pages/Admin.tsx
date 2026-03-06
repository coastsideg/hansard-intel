import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import {
  Database,
  RefreshCw,
  Download,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  FileText,
} from 'lucide-react';

interface SourceStats {
  total: number;
  pending: number;
  complete: number;
  errors: number;
}

interface ContributionStats {
  total: number;
  ai_processed: number;
}

interface SystemStats {
  total_records: number;
  records_by_year: Record<string, number>;
  is_scraping: boolean;
  last_harvest: string;
  sources: SourceStats;
  contributions: ContributionStats;
}

export function cleanJsonResponse(raw: string): unknown {
  if (!raw || typeof raw !== 'string') {
    throw new Error('cleanJsonResponse: input must be a non-empty string');
  }
  const stripped = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const jsonStart = stripped.search(/[{[]/);
  if (jsonStart === -1) {
    throw new Error(`cleanJsonResponse: No JSON found.\nRaw: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(stripped.slice(jsonStart));
}

export default function Admin() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [scrapeYear, setScrapeYear] = useState('2021');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStats = async () => {
    try {
      const { data } = await api.get<SystemStats>('/admin/status');
      setStats(data);
      setFetchError(null);
    } catch {
      setFetchError('Failed to reach backend. Check Railway logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleScrape = async () => {
    const year = parseInt(scrapeYear, 10);
    if (isNaN(year) || year < 2017 || year > 2025) {
      setActionMessage({ type: 'error', text: 'Enter a valid year between 2017 and 2025.' });
      return;
    }
    if (!window.confirm(`Start historical scrape from ${year} to present?`)) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      const { data } = await api.post('/admin/scrape/historical', { from_year: year });
      setActionMessage({ type: 'success', text: data.message || `Scrape from ${year} started.` });
      await fetchStats();
    } catch (err: unknown) {
      let message = 'Failed to start scrape. Check Railway backend logs.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        try {
          const raw = JSON.stringify(axiosErr.response?.data ?? '');
          const parsed = cleanJsonResponse(raw) as { detail?: string };
          message = parsed?.detail ?? message;
        } catch {
          message = axiosErr.response?.data?.detail ?? message;
        }
      }
      setActionMessage({ type: 'error', text: message });
    } finally {
      setActionLoading(false);
    }
  };

  const maxYearCount = stats?.records_by_year
    ? Math.max(...Object.values(stats.records_by_year), 1)
    : 1;

  const aiProgressPct =
    stats?.contributions.total && stats.contributions.total > 0
      ? Math.round((stats.contributions.ai_processed / stats.contributions.total) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <XCircle size={20} />
          <span className="font-medium">{fetchError}</span>
          <button onClick={fetchStats} className="ml-auto text-sm underline hover:no-underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="text-blue-600" size={26} />
          Admin Research Control
        </h1>
        <div className="flex items-center gap-4">
          {stats?.is_scraping && (
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm animate-pulse">
              <RefreshCw className="animate-spin" size={16} /> SCRAPE IN PROGRESS
            </div>
          )}
          <button onClick={fetchStats} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm font-medium ${actionMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {actionMessage.type === 'success'
            ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          {actionMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Download size={20} className="text-blue-600" /> Historical Ingestion
          </h2>
          <p className="text-sm text-gray-500">
            Enter start year to automatically download and index all Hansard PDFs from that year to present.
          </p>
          <div className="flex gap-3">
            <input
              type="number"
              value={scrapeYear}
              onChange={(e) => setScrapeYear(e.target.value)}
              min={2017}
              max={2025}
              className="w-24 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleScrape}
              disabled={actionLoading || stats?.is_scraping}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {stats?.is_scraping ? 'Scrape Running…' : actionLoading ? 'Starting…' : 'Start Automated Scrape'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" /> Database Integrity
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Total Records</span>
              <span className="text-2xl font-bold text-gray-900">{stats?.total_records.toLocaleString() ?? '—'}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Last Harvest</span>
              <span className="text-sm font-bold text-gray-700">{stats?.last_harvest ?? 'Never'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sources Total', value: stats?.sources.total ?? 0, icon: <FileText size={16} className="text-gray-400" />, color: 'text-gray-900' },
          { label: 'Pending Ingest', value: stats?.sources.pending ?? 0, icon: <Clock size={16} className="text-amber-500" />, color: 'text-amber-600' },
          { label: 'Completed', value: stats?.sources.complete ?? 0, icon: <CheckCircle2 size={16} className="text-green-500" />, color: 'text-green-600' },
          { label: 'Errors', value: stats?.sources.errors ?? 0, icon: <XCircle size={16} className="text-red-500" />, color: 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              {item.icon}
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{item.label}</span>
            </div>
            <span className={`text-xl font-bold ${item.color}`}>{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Cpu size={16} className="text-blue-600" /> AI Processing Progress
          </h2>
          <span className="text-sm font-bold text-gray-500">
            {stats?.contributions.ai_processed.toLocaleString()} / {stats?.contributions.total.toLocaleString()} contributions
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${aiProgressPct}%` }} />
        </div>
        <p className="text-xs text-gray-400">{aiProgressPct}% AI-analysed</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="font-bold text-sm text-gray-700 uppercase tracking-wider">Data Coverage by Year</span>
          {stats?.is_scraping && <span className="text-xs text-blue-600 font-semibold animate-pulse">Updating…</span>}
        </div>
        <div className="p-6">
          {stats?.records_by_year && Object.keys(stats.records_by_year).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.records_by_year)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([year, count]) => (
                  <div key={year} className="flex items-center gap-4">
                    <span className="w-12 font-bold text-gray-700 text-sm">{year}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((count / maxYearCount) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-bold text-gray-900">{count.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 font-medium py-4">
              <AlertCircle size={20} />
              No historical records detected. Enter a start year above and initiate a scrape.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
