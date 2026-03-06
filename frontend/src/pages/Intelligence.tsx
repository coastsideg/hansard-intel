import React, { useState } from 'react';
import { useIntelligenceStore } from '../stores/intelligence';
import { Search, FileText, Loader2 } from 'lucide-react';

export default function Intelligence() {
  const [query, setQuery] = useState('');
  const { askQuestion, response, loading } = useIntelligenceStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await askQuestion(query);
  };

  // Clean the AI response of JSON markers
  const cleanResponse = (text: string | null) => {
    if (!text) return null;
    return text
      .replace(/```json\n?/, '')
      .replace(/```/, '')
      .replace(/\\n/g, '\n')
      .replace(/{[\s\S]*"response":\s*"/, '') // Remove JSON header
      .replace(/"\s*,\s*"confidence"[\s\S]*}/, ''); // Remove JSON footer
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">HANSARD INTEL AI</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Hansard Records..."
            className="w-full p-4 border-2 border-blue-600 rounded-xl outline-none"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg">
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
        </div>
      </form>

      {response && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-4 bg-gray-900 text-white rounded-t-xl flex items-center gap-2">
            <FileText size={18} />
            <span className="font-bold text-xs uppercase tracking-widest">Intelligence Report</span>
          </div>
          <div className="p-8 text-gray-900 whitespace-pre-wrap leading-relaxed">
            {cleanResponse(response)}
          </div>
        </div>
      )}
    </div>
  );
}
