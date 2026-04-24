import Sidebar from '../components/layout/Sidebar'
import { useStatsStore } from '../store/statsStore'
import { useAuthStore } from '../store/authStore'
import { useEffect } from 'react'

export default function History() {
  const { player } = useAuthStore()
  const { history, victories, defeats, loading, loadHistory } = useStatsStore()

  useEffect(() => {
    if (player?.id) loadHistory(player.id)
  }, [player?.id])

  const total = victories + defeats
  const winRate = total > 0 ? ((victories / total) * 100).toFixed(1) : '0.0'

  return (
    <div
      className="flex min-h-screen overflow-x-hidden"
      style={{
        backgroundColor: '#0a0e1a',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0V0zm10 10v40h40V10H10zm5 5h30v30H15V15zm5 5v20h20V20H20z' fill='%23171b28' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E\")",
        color: '#dfe2f3',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <Sidebar />

      <main className="ml-64 flex-1 relative min-h-screen">
        <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-surface-container-lowest font-headline tracking-wider shadow-[0_4px_20px_rgba(51,34,111,0.08)]">
          <div className="text-2xl font-bold uppercase tracking-tighter text-primary">Archives</div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-primary">history_edu</span>
            {total} batailles enregistrées
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-highest rounded-xl p-6 text-center shadow-xl">
              <p className="text-4xl font-black text-on-surface font-headline">{victories}</p>
              <p className="text-[10px] uppercase tracking-widest text-primary mt-1">Victoires</p>
            </div>
            <div className="bg-surface-container-highest rounded-xl p-6 text-center shadow-xl">
              <p className="text-4xl font-black text-on-surface font-headline">{defeats}</p>
              <p className="text-[10px] uppercase tracking-widest text-error mt-1">Défaites</p>
            </div>
            <div className="bg-surface-container-highest rounded-xl p-6 text-center shadow-xl">
              <p className="text-4xl font-black text-on-surface font-headline">{winRate}%</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Taux de victoire</p>
            </div>
          </div>

          {/* Full history */}
          <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              <h3 className="font-headline text-xl text-primary">Chronique des batailles</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-12">Aucune bataille pour l'instant. Cherche la gloire sur le champ de bataille.</p>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {history.map((game) => (
                  <div key={game.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors">
                    <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${game.result === 'victory' ? 'bg-primary' : 'bg-error'}`} />
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface">{game.opponentUsername}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {game.endedAt ? new Date(game.endedAt).toLocaleString() : '—'}
                      </p>
                    </div>
                    <span className={`text-xs font-black tracking-widest uppercase px-3 py-1 rounded border ${
                      game.result === 'victory'
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-error/10 border-error/30 text-error'
                    }`}>
                      {game.result === 'victory' ? 'Victoire' : 'Défaite'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
