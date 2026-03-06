import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Clock } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
          Opposition Research Facility
        </h1>
        <p className="text-xl text-gray-600">
          Clinical analysis of Western Australian Hansard records since 2017.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => navigate('/intelligence')}
          className="flex flex-col items-center p-8 bg-white border-2 border-blue-500 rounded-2xl hover:bg-blue-50 transition-all group"
        >
          <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
            <Search className="text-blue-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Conversational AI</h2>
          <p className="text-gray-600 text-center">
            Ask specific questions about dates, members, and quotes.
          </p>
        </button>

        <button
          onClick={() => navigate('/admin')}
          className="flex flex-col items-center p-8 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 transition-all group"
        >
          <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:bg-gray-200 transition-colors">
            <Clock className="text-gray-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">System Status</h2>
          <p className="text-gray-600 text-center">
            Monitor database indexing and processing progress.
          </p>
        </button>
      </div>
    </div>
  );
}
