import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, User, Calendar, Quote, Loader2 } from 'lucide-react';

interface Contribution {
  id: string;
  date: string;
  title: string;
  content: string;
}

interface MemberDetail {
  id: string;
  name: string;
  party: string;
  electorate: string;
  contributions: Contribution[];
}

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberDetail = async () => {
      try {
        const { data } = await api.get(`/members/${id}`);
        setMember(data);
      } catch (err) {
        console.error('Failed to fetch member details');
      } finally {
        setLoading(false);
      }
    };
    fetchMemberDetail();
  }, [id]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!member) return <div className="p-6 text-red-600 font-bold text-center">Member record not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button 
        onClick={() => navigate('/members')}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-8 transition-colors font-medium text-sm"
      >
        <ArrowLeft size={16} /> Back to Directory
      </button>

      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm mb-8 flex items-center gap-6">
        <div className="bg-blue-50 p-4 rounded-2xl">
          <User size={48} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{member.name}</h1>
          <p className="text-gray-600">{member.party} — Member for {member.electorate}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Quote size={20} className="text-blue-600" />
        Speech Record
      </h2>

      <div className="space-y-4">
        {member.contributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((speech) => (
          <div key={speech.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold mb-3 uppercase tracking-wider">
              <Calendar size={14} />
              {new Date(speech.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{speech.title}</h3>
            <p className="text-gray-700 line-clamp-3 italic leading-relaxed">
              "{speech.content.substring(0, 300)}..."
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
