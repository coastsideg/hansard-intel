import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Hexagon, Lock } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--intel-black)' }}>
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(var(--intel-gold) 1px, transparent 1px), linear-gradient(90deg, var(--intel-gold) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Hexagon size={28} style={{ color: 'var(--intel-gold)' }} strokeWidth={1} />
            <span className="font-display text-4xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.25em' }}>
              HANSARD
            </span>
          </div>
          <div className="font-display text-sm tracking-widest" style={{ color: 'var(--intel-muted)', letterSpacing: '0.5em' }}>
            INTELLIGENCE PLATFORM
          </div>
          <div className="mt-3 text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>
            WA Labor — Premier's Office
          </div>
        </div>

        {/* Form */}
        <div className="intel-card rounded-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={14} style={{ color: 'var(--intel-gold)' }} />
            <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--intel-muted)' }}>SECURE ACCESS</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--intel-muted)' }}>USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded text-sm font-body outline-none transition-all"
                style={{
                  background: 'var(--intel-black)',
                  border: '1px solid var(--intel-border)',
                  color: '#e8e8f0',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--intel-gold)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--intel-border)'}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--intel-muted)' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded text-sm font-body outline-none transition-all"
                style={{
                  background: 'var(--intel-black)',
                  border: '1px solid var(--intel-border)',
                  color: '#e8e8f0',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--intel-gold)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--intel-border)'}
                required
              />
            </div>

            {error && (
              <div className="text-xs font-mono py-2 px-3 rounded" style={{ background: 'rgba(230,57,70,0.1)', color: 'var(--intel-red)', border: '1px solid rgba(230,57,70,0.2)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded text-sm font-medium tracking-wide transition-all mt-2"
              style={{
                background: loading ? 'rgba(201,168,76,0.3)' : 'var(--intel-gold)',
                color: loading ? 'rgba(0,0,0,0.5)' : '#0a0a0f',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
