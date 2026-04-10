import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import OracleModal from '../OracleModal'

interface SidebarProps {
  activeRoute?: string
}

const navItems = [
  { label: 'Battlefront', icon: 'swords', to: '/dashboard' },
  { label: 'Armory', icon: 'style', to: '/deck-builder' },
  { label: 'Pantheon', icon: 'groups', to: '/leaderboard' },
  { label: 'Treasury', icon: 'account_balance', to: '/shop' },
  { label: 'Archives', icon: 'history_edu', to: '/history' },
]

export default function Sidebar({ activeRoute }: SidebarProps) {
  const { player, logout } = useAuthStore()
  const navigate = useNavigate()
  const [oracleOpen, setOracleOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40 bg-surface shadow-[10px_0_30px_rgba(10,14,26,0.5)] font-headline font-medium">
      <div className="px-8 py-10">
        <h1 className="text-xl font-black text-primary-container tracking-tighter">OLYMPOS</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive || activeRoute === item.to
                ? 'flex items-center gap-4 px-4 py-3 bg-[#2d1b69]/40 text-primary border-r-4 border-primary backdrop-blur-md transition-all duration-300'
                : 'flex items-center gap-4 px-4 py-3 text-surface-variant hover:bg-surface-container-low hover:text-primary-container hover:translate-x-2 transition-all duration-300'
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-surface-container-low p-4 rounded-lg flex items-center gap-3 shadow-2xl mb-6">
          <div className="w-10 h-10 rounded-full border-2 border-primary bg-surface-container-highest flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">person</span>
          </div>
          <div>
            <p className="text-sm font-bold text-primary">{player?.username || 'Hero'}</p>
            <p className="text-[10px] text-surface-variant uppercase tracking-widest">Rank: {player?.rank || 'Mortal'}</p>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setOracleOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-surface-variant hover:text-secondary transition-colors group"
          >
            <span className="material-symbols-outlined text-sm group-hover:animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="text-xs uppercase tracking-widest">Oracle</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="text-xs uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </div>
    </aside>

    {oracleOpen && <OracleModal onClose={() => setOracleOpen(false)} />}
    </>
  )
}
