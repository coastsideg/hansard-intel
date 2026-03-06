import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../stores/admin';
import { Activity, Database, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function Admin() {
  const { status, loading, fetchStatus, processFailed, harvest } = useAdminStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleManualAction = async (action: () => Promise<void>) => {
    setIsRefreshing(true);
    await action();
    await fetchStatus();
    setIsRefreshing(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Control</h1>
          <p className="text-gray-600">Monitor database health and processing.</p>
        </div>
        {(loading || isRefreshing) && <Loader2 className="animate-spin text-blue-600" size={24} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Database size={20} />
            <span className="font-semibold uppercase tracking-wider text-xs">Total Speeches</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{status?.total_contributions || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 size={20} />
            <span className="font-semibold uppercase tracking-wider text-xs">Processed Days</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{status?.total_processed_days || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertCircle size={20} />
            <span className="font-semibold uppercase tracking-wider text-xs">Errors</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{status?.total_errors || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
          <Activity size={18} />
          Maintenance Controls
        </div>
        <div className="p-6 flex flex-wrap gap-4">
          <button
            onClick={() => handleManualAction(processFailed)}
            disabled={loading || isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors"
          >
            Retry Failed Files
          </button>
          <button
            onClick={() => handleManualAction(harvest)}
            disabled={loading || isRefreshing}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 font-medium transition-colors"
          >
            Trigger Manual Harvest
          </button>
        </div>
      </div>
    </div>
  );
}
