import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Database, RefreshCw, Download, BarChart3, Loader2, AlertCircle } from 'lucide-react';

interface SystemStats {
  total_records: number;
  records_by_year: Record<string, number>;
  is_scraping: boolean;
  last_harvest: string;
}

export default function Admin() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapeYear, setScrapeYear] = useState('2017');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/status');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch system statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleScrape = async () => {
    if (!window.confirm(`Initiate automated scrape for all Hansard records from ${scrapeYear} to present?`)) return;
    setActionLoading(true);
    try {
      await api.post('/admin/scrape/historical', { from_year: parseInt(scrapeYear) });
      alert('Historical scrape initiated in background.');
    } catch (err) {
      alert('Failed to initiate scrape. Check backend logs.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="text-blue-600" /> Admin Research Control
        </h1>
        <div className="flex items-center gap-4">
          {stats?.is_scraping && (
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm animate-pulse">
              <RefreshCw className="animate-spin" size={16} /> SCRAPE IN PROGRESS
            </div>
          )}
          <button onClick={fetchStats} className="p-2 text-gray-500 hover:text-blue-600"><RefreshCw size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Scraper Control */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Download size={20} className="text-blue-600" /> Historical Ingestion
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Enter start year to automatically download and index all Hansard PDFs.</p>
            <div className="flex gap-3">
              <input
                type="number"
                value={scrapeYear}
                onChange={(e) => setScrapeYear(e.target.value)}
                className="w-24 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleScrape}
                disabled={actionLoading || stats?.is_scraping}
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                Start Automated Scrape
              </button>
            </div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" /> Database Integrity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="block text-xs font-bold text-gray-500 uppercase">Total Records</span>
              <span className="text-2xl font-bold text-gray-900">{stats?.total_records.toLocaleString()}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="block text-xs font-bold text-gray-500 uppercase">Last Harvest</span>
              <span className="text-sm font-bold text-gray-700">{stats?.last_harvest || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Year Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 font-bold text-sm text-gray-700 uppercase tracking-wider">
          Data Coverage by Year
        </div>
        <div className="p-6">
          {stats?.records_by_year && Object.keys(stats.records_by_year).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.records_by_year).sort((a, b) => b[0].localeCompare(a[0])).map(([year, count]) => (
                <div key={year} className="flex items-center gap-4">
                  <span className="w-16 font-bold text-gray-700">{year}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min((count / 5000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="w-20 text-right text-sm font-bold text-gray-900">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 font-medium py-4">
              <AlertCircle size={20} /> No historical records detected. Initiate a scrape to populate the research facility.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
