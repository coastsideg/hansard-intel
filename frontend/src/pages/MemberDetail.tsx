import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { contributionsApi, membersApi } from '../lib/api'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ContributionCard from '../components/ContributionCard'

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: contributions } = useQuery({
    queryKey: ['contributions', id],
    queryFn: () => contributionsApi.list({ member_id: id, limit: 50 }).then((r) => r.data),
    enabled: !!id,
  })

  const member = contributions?.[0]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--intel-muted)' }}>
        <ArrowLeft size={14} />
        Back to Members
      </button>

      {member && (
        <div className="mb-6">
          <h1 className="font-display text-3xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
            {member.member_name.toUpperCase()}
          </h1>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--intel-muted)' }}>
            {member.member_party} · {contributions?.length} contributions loaded
          </div>
        </div>
      )}

      <div className="space-y-3">
        {contributions?.map((c: any) => <ContributionCard key={c.id} contribution={c} />)}
        {!contributions?.length && (
          <div className="intel-card rounded-lg p-6 text-center text-sm" style={{ color: 'var(--intel-muted)' }}>
            No contributions found for this member.
          </div>
        )}
      </div>
    </div>
  )
}
