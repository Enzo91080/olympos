import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface TopbarProps {
  title?: string
  showNav?: boolean
}

export default function Topbar({ title = 'Olympos: Card Clash', showNav = true }: TopbarProps) {
  const { player } = useAuthStore()

  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-surface-container-lowest shadow-[0_4px_20px_rgba(51,34,111,0.08)] font-headline tracking-wider">
      <div className="flex items-center gap-8">
        <div className="text-2xl font-bold uppercase tracking-tighter text-primary">
          {title}
        </div>
        {showNav && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-surface-variant hover:text-primary-container transition-colors'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/deck-builder"
              className={({ isActive }) =>
                isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-surface-variant hover:text-primary-container transition-colors'
              }
            >
              Deck Builder
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-surface-variant hover:text-primary-container transition-colors'
              }
            >
              Temple
            </NavLink>
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-surface-variant hover:text-primary-container transition-colors'
              }
            >
              Vault
            </NavLink>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-primary-container hover:bg-surface-container-low rounded-full transition-all duration-300">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-primary-container hover:bg-surface-container-low rounded-full transition-all duration-300">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-primary/20">
          <span className="material-symbols-outlined text-primary">person</span>
        </div>
      </div>
    </header>
  )
}
