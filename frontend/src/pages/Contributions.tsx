import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Calendar, User, Search, Loader2 } from 'lucide-react';

interface Contribution {
  id: string;
  date: string;
  member_name: string;
  title: string;
  content: string;
}

export default function Contributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const { data } = await api.get('/contributions');
        setContributions(data);
      } catch (err) {
        console.error('Failed to fetch contributions');
      } finally {
        setLoading(false);
      }
    };
    fetchContributions();
  }, []);

  const filtered = contributions.filter(c => 
    c.member_name.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.content.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Hansard Records</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg outline-none"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex gap-4 mb-3 text-sm font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-blue-600">
                <Calendar size={14} />
                {new Date(item.date).toLocaleDateString('en-AU')}
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <User size={14} />
                {item.member_name}
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-700 italic">"{item.content}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
