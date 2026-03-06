import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Database, RefreshCw, AlertCircle, Loader2, Download } from 'lucide-react';

export default function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetYear, setTargetYear] = useState('2021');

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/status');
      setStats(data);
    } catch (err) {
      console.error('Stats fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const startScrape = async () => {
    if (!confirm(`Begin scraping all Hansard records for ${targetYear}?`)) return;
    try {
      await api.post('/admin/scrape/historical', { from_year: parseInt(targetYear) });
      alert('Scrape initiated. This will take several minutes.');
    } catch (err) {
      alert('Scrape failed to start.');
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2"><Database /> Data Management</h1>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h2 className="font-bold mb-4 flex items-center gap-2"><Download size={18}/> Historical Scraper</h2>
        <div className="flex gap-4">
          <input 
            type="number" 
            value={targetYear} 
            onChange={(e) => setTargetYear(e.target.value)}
            className="border p-2 rounded w-32"
          />
          <button onClick={startScrape} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
            Scrape {targetYear}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Use this to fill data gaps for specific years.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b font-bold text-xs uppercase">Record Distribution</div>
        <div className="p-6">
          {Object.entries(stats?.records_by_year || {}).map(([year, count]: any) => (
            <div key={year} className="flex justify-between border-b py-2">
              <span className="font-bold">{year}</span>
              <span>{count} records</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
