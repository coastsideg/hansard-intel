import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { LayoutDashboard, Users, FileText, Brain, Settings, LogOut, Hexagon } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/contributions', icon: FileText, label: 'Contributions' },
  { to: '/intelligence', icon: Brain, label: 'Intelligence' },
  { to: '/admin', icon: Settings, label: 'Admin' },
]

export default function Layout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--intel-black)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r" style={{ borderColor: 'var(--intel-border)', background: 'var(--intel-dark)' }}>
        {/* Logo */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--intel-border)' }}>
          <div className="flex items-center gap-2">
            <Hexagon size={18} style={{ color: 'var(--intel-gold)' }} strokeWidth={1.5} />
            <span className="font-display text-xl tracking-widest" style={{ color: 'var(--intel-gold)', letterSpacing: '0.2em' }}>
              HANSARD
            </span>
          </div>
          <div className="font-display text-xs tracking-widest mt-0.5 pl-6" style={{ color: 'var(--intel-muted)', letterSpacing: '0.3em' }}>
            INTEL
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-150',
                  isActive
                    ? 'nav-active bg-intel-gold-dim font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                )
              }
            >
              <Icon size={15} />
              <span className="font-body">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-4 border-t" style={{ borderColor: 'var(--intel-border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
          <div className="mt-3 px-3">
            <div className="text-xs font-mono" style={{ color: 'var(--intel-muted)' }}>WA Labor Premier's Office</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--intel-border)' }}>v2.0</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
