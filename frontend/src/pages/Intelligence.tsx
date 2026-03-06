import React, { useState } from 'react';
import { useIntelligenceStore } from '../stores/intelligence';
import { Search, MessageSquare, Loader2, FileText } from 'lucide-react';

export default function Intelligence() {
  const [query, setQuery] = useState('');
  const { askQuestion, response, loading } = useIntelligenceStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await askQuestion(query);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HANSARD INTEL AI</h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest">Clinical Research Mode</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter research query..."
            className="w-full p-4 pr-12 text-lg border-2 border-blue-600 rounded-xl outline-none shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={24} />}
          </button>
        </div>
      </form>

      {response && (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span className="font-bold text-sm uppercase">Intelligence Report</span>
            </div>
          </div>
          <div className="p-8 text-gray-900 whitespace-pre-wrap font-sans leading-relaxed">
            {response.replace(/\\n/g, '\n').replace(/#{1,6}\s?/g, '')}
          </div>
        </div>
      )}
    </div>
  );
}
