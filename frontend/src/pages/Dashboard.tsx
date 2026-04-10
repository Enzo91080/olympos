import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useAuthStore } from '../store/authStore'
import { useStatsStore } from '../store/statsStore'
import { useGameStore } from '../store/gameStore'
import { useDeckStore } from '../store/deckStore'
import { gameService } from '../services/gameService'

export default function Dashboard() {
  const { player } = useAuthStore()
  const { victories, defeats, history } = useStatsStore()
  const { startGame } = useGameStore()
  const { currentDeck } = useDeckStore()
  const navigate = useNavigate()

  const [isSearching, setIsSearching] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  const total = victories + defeats
  const winRate = total > 0 ? ((victories / total) * 100).toFixed(1) : '0.0'

  const handleFindMatch = async () => {
    if (isSearching) return
    setMatchError(null)

    if (!currentDeck) {
      setMatchError('You need a deck to play. Build one in the Armory first.')
      return
    }
    if (!currentDeck.isValid) {
      setMatchError(`Your deck needs exactly 30 cards (${currentDeck.cards.reduce((a, dc) => a + dc.quantity, 0)}/30).`)
      return
    }

    setIsSearching(true)
    try {
      const data = await gameService.startSoloGame(currentDeck.id)
      startGame(data, player!.id, player!.username)
      navigate(`/game/${data.gameId}`)
    } catch (e: any) {
      setMatchError(e.response?.data?.message ?? 'Failed to start game. Try again.')
      setIsSearching(false)
    }
  }

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
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-surface-container-lowest font-headline tracking-wider shadow-[0_4px_20px_rgba(51,34,111,0.08)]">
          <div className="text-2xl font-bold uppercase tracking-tighter text-primary">Olympos: Card Clash</div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-primary-container hover:bg-surface-container-low rounded-full transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-primary-container hover:bg-surface-container-low rounded-full transition-all">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
          </div>
        </header>

        <div className="p-8 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Hero Profile */}
            <section className="relative overflow-hidden bg-surface-container-high rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 border-l-4 border-primary">
              <div className="relative z-10 w-32 h-32 rounded-full ring-4 ring-primary ring-offset-4 ring-offset-surface-container-low shadow-2xl bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-6xl">shield</span>
              </div>
              <div className="relative z-10 text-center md:text-left">
                <h2 className="font-headline text-4xl font-black text-primary mb-1">{player?.username || 'Aegis Bearer'}</h2>
                <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
                  <span className="px-3 py-1 bg-secondary-container/40 text-secondary border border-secondary/30 rounded text-xs font-bold tracking-widest uppercase">
                    Rank: {player?.rank || 'Olympian'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">stars</span>
                    <span className="text-xl font-bold text-on-surface">
                      {(player?.eloScore ?? 0).toLocaleString()} <span className="text-xs text-on-surface-variant font-medium">ELO</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[200px]">shield</span>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Battle Statistics */}
              <section className="bg-surface-container-highest rounded-xl p-6 shadow-xl">
                <h3 className="font-headline text-xl text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">analytics</span>
                  Battle Statistics
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black text-on-surface leading-none">{victories}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Victories</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-error leading-none">{defeats}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Defeats</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                      <span className="text-on-surface">Win Rate</span>
                      <span className="text-primary">{winRate}%</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full relative transition-all duration-700"
                        style={{ width: `${winRate}%` }}
                      >
                        <div className="absolute top-0 right-0 h-full w-2 bg-white blur-sm"></div>
                        <div className="absolute top-0 right-0 h-full w-[2px] bg-white"></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline-variant/20">
                    <div className="text-center">
                      <p className="text-lg font-bold text-on-surface">{total}</p>
                      <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Total Games</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-on-surface">
                        {(() => { let s = 0; for (const g of [...history].reverse()) { if (g.result === 'victory') s++; else break; } return s; })()}
                      </p>
                      <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Win Streak</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-on-surface">Gold</p>
                      <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">League</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent Conquests */}
              <section className="bg-surface-container-highest rounded-xl p-6 shadow-xl">
                <h3 className="font-headline text-xl text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">history</span>
                  Recent Conquests
                </h3>
                <div className="space-y-3">
                  {history.slice(0, 5).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${game.result === 'victory' ? 'bg-primary' : 'bg-error'}`}></div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{game.opponentUsername}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {game.endedAt ? new Date(game.endedAt).toLocaleDateString() : '—'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-black tracking-widest uppercase ${game.result === 'victory' ? 'text-primary' : 'text-error'}`}>
                        {game.result}
                      </span>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-4">No games played yet</p>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* CTA & Matchmaking */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
            <div className="flex-1 bg-surface-container-low rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-8 group min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent z-10"></div>
              {/* Animated background glow when searching */}
              {isSearching && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse z-0"></div>
              )}
              <div className="relative z-20 text-center">
                <p className="font-headline text-primary tracking-[0.3em] uppercase text-sm mb-4">
                  {isSearching ? 'Entering the arena...' : 'The Gods Await'}
                </p>
                {matchError && (
                  <p className="text-error text-sm mb-3 font-bold">{matchError}</p>
                )}
                <button
                  onClick={handleFindMatch}
                  disabled={isSearching}
                  className={`text-on-primary px-12 py-6 rounded-lg text-2xl font-black font-headline uppercase tracking-tighter transition-all duration-300 relative overflow-hidden
                    ${isSearching
                      ? 'bg-surface-container-high opacity-60 cursor-not-allowed'
                      : 'ichor-gradient shadow-[0_0_50px_rgba(230,195,100,0.3)] hover:shadow-[0_0_70px_rgba(230,195,100,0.5)] active:scale-95'
                    }`}
                >
                  {isSearching ? (
                    <span className="flex items-center gap-3">
                      <span className="animate-spin material-symbols-outlined text-xl">autorenew</span>
                      Starting Game...
                    </span>
                  ) : 'Find a Match'}
                </button>
                <div className="mt-8 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                    <span className="text-on-surface font-bold">14,203 Divine Souls</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Average Queue Time: 0:24</p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/deck-builder')}
                className="p-4 bg-surface-container-highest rounded-xl border border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container-high transition-all text-left group"
              >
                <span className="material-symbols-outlined text-primary-container text-2xl group-hover:text-primary transition-colors">style</span>
                <p className="text-sm font-bold text-on-surface mt-2">Build Deck</p>
                <p className="text-[10px] text-on-surface-variant">Armory</p>
              </button>
              <button className="p-4 bg-surface-container-highest rounded-xl border border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container-high transition-all text-left group">
                <span className="material-symbols-outlined text-primary-container text-2xl group-hover:text-primary transition-colors">groups</span>
                <p className="text-sm font-bold text-on-surface mt-2">Leaderboard</p>
                <p className="text-[10px] text-on-surface-variant">Pantheon</p>
              </button>
            </div>

            {/* Timed Challenge */}
            <div className="glass-panel rounded-xl p-6 border border-outline-variant/20 relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-fixed mb-2 block">Timed Challenge</span>
                <h4 className="font-headline text-xl text-on-surface mb-2">Trials of Poseidon</h4>
                <p className="text-sm text-on-surface-variant mb-4">Defeat oceanic legends to unlock the 'Trident's Call' card skin.</p>
                <button className="w-full py-2 bg-secondary-container text-secondary text-xs font-bold uppercase tracking-widest rounded border border-secondary/20 hover:bg-secondary-container/60 transition-all">
                  Enter Temple
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none">
                <span className="material-symbols-outlined text-8xl">waves</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
