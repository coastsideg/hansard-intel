import React, { useState } from 'react';
import { useIntelligenceStore } from '../stores/intelligence';
import { Search, MessageSquare, Loader2 } from 'lucide-react';

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
        <p className="text-gray-600">Direct search of Western Australian Parliamentary records since 2017.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question (e.g., 'When did the Premier mention Metronet in February 2026?')"
            className="w-full p-4 pr-12 text-lg border-2 border-blue-500 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={24} />}
          </button>
        </div>
      </form>

      {response && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" />
            <span className="font-semibold text-gray-700">AI Response</span>
          </div>
          <div className="p-6 prose max-w-none text-gray-800 leading-relaxed">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}
