import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useAuthStore } from '../store/authStore'
import { useStatsStore } from '../store/statsStore'
import { useGameStore } from '../store/gameStore'
import { toGameCard } from '../store/gameStore'
import { useDeckStore } from '../store/deckStore'
import { gameService } from '../services/gameService'
import { gameSocket } from '../socket/gameSocket'

export default function Dashboard() {
  const { player } = useAuthStore()
  const { victories, defeats, history, loadHistory } = useStatsStore()
  const { startGame, startPvpGame } = useGameStore()
  const { currentDeck, loadDecksAndCards, allCards } = useDeckStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (player?.id) loadHistory(player.id)
    loadDecksAndCards()
  }, [player?.id])

  const [isSearching, setIsSearching] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [pvpStatus, setPvpStatus] = useState<'idle' | 'searching' | 'error'>('idle')
  const [pvpError, setPvpError] = useState<string | null>(null)

  const total = victories + defeats
  const winRate = total > 0 ? ((victories / total) * 100).toFixed(1) : '0.0'
  const winStreak = (() => { let s = 0; for (const g of [...history].reverse()) { if (g.result === 'victory') s++; else break; } return s })()
  const deckCount = currentDeck?.cards.reduce((a, dc) => a + dc.quantity, 0) ?? 0

  const handleFindPvp = () => {
    if (!currentDeck) {
      setPvpError('Tu as besoin d\'un deck pour jouer. Crée-en un dans l\'Armurerie.')
      return
    }
    if (!currentDeck.isValid) {
      setPvpError(`Ton deck doit contenir exactement 10 cartes (${deckCount}/10).`)
      return
    }
    setPvpError(null)
    setPvpStatus('searching')

    const token = useAuthStore.getState().token ?? ''
    gameSocket.connect(token)

    // Clear any stale listeners before registering new ones
    gameSocket.off('matchmaking:waiting')
    gameSocket.off('matchmaking:matched')
    gameSocket.off('matchmaking:error')

    gameSocket.onMatchmakingWaiting(() => {
      // already in searching state — nothing to update
    })

    gameSocket.onMatchmakingMatched((data) => {
      // Build card lookup from all available cards
      const lookup: Record<string, ReturnType<typeof toGameCard>> = {}
      allCards.forEach(c => { lookup[c.id] = toGameCard(c as any) })

      startPvpGame(data, player!.id, player!.username, lookup)
      setPvpStatus('idle')
      navigate(`/game/${data.gameId}?pvp=1`)
    })

    gameSocket.onMatchmakingError((err) => {
      setPvpError(err.message)
      setPvpStatus('error')
      gameSocket.disconnect()
    })

    gameSocket.joinMatchmaking(currentDeck.id)
  }

  const handleCancelPvp = () => {
    gameSocket.leaveMatchmaking()
    gameSocket.off('matchmaking:matched')
    gameSocket.off('matchmaking:waiting')
    gameSocket.off('matchmaking:error')
    gameSocket.disconnect()
    setPvpStatus('idle')
    setPvpError(null)
  }

  const handleFindMatch = async () => {
    if (isSearching) return
    setMatchError(null)

    if (!currentDeck) {
      setMatchError('Tu as besoin d\'un deck pour jouer. Crée-en un dans l\'Armurerie.')
      return
    }
    if (!currentDeck.isValid) {
      setMatchError(`Ton deck doit contenir exactement 10 cartes (${deckCount}/10).`)
      return
    }

    setIsSearching(true)
    try {
      const data = await gameService.startSoloGame(currentDeck.id)
      startGame(data, player!.id, player!.username)
      navigate(`/game/${data.gameId}`)
    } catch (e: any) {
      setMatchError(e.response?.data?.message ?? 'Impossible de démarrer la partie. Réessaie.')
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
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-primary">person</span>
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
                <h2 className="font-headline text-4xl font-black text-primary mb-1">{player?.username || 'Guerrier'}</h2>
                <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
                  <span className="px-3 py-1 bg-secondary-container/40 text-secondary border border-secondary/30 rounded text-xs font-bold tracking-widest uppercase">
                    Rang : {player?.rank || 'Olympien'}
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
              {/* Statistiques */}
              <section className="bg-surface-container-highest rounded-xl p-6 shadow-xl">
                <h3 className="font-headline text-xl text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">analytics</span>
                  Statistiques
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black text-on-surface leading-none">{victories}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Victoires</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-error leading-none">{defeats}</p>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Défaites</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                      <span className="text-on-surface">Taux de victoire</span>
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

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20">
                    <div className="text-center">
                      <p className="text-lg font-bold text-on-surface">{total}</p>
                      <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Parties jouées</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-on-surface">{winStreak}</p>
                      <p className="text-[8px] uppercase tracking-widest text-on-surface-variant">Série en cours</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Conquêtes récentes */}
              <section className="bg-surface-container-highest rounded-xl p-6 shadow-xl">
                <h3 className="font-headline text-xl text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">history</span>
                  Conquêtes récentes
                </h3>
                <div className="space-y-3">
                  {history.slice(0, 5).map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${game.result === 'victory' ? 'bg-primary' : 'bg-error'}`}></div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{game.opponentUsername}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {game.endedAt ? new Date(game.endedAt).toLocaleDateString('fr-FR') : '—'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-black tracking-widest uppercase ${game.result === 'victory' ? 'text-primary' : 'text-error'}`}>
                        {game.result === 'victory' ? 'Victoire' : 'Défaite'}
                      </span>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-4">Aucune partie jouée</p>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* CTA & Matchmaking */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
            <div className="flex-1 bg-surface-container-low rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-8 group min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent z-10"></div>
              {isSearching && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse z-0"></div>
              )}
              <div className="relative z-20 text-center w-full">
                <p className="font-headline text-primary tracking-[0.3em] uppercase text-sm mb-6">
                  Les dieux t'attendent
                </p>
                {(matchError || pvpError) && (
                  <p className="text-error text-sm mb-3 font-bold">{matchError || pvpError}</p>
                )}

                {/* Vs Bot */}
                <button
                  onClick={handleFindMatch}
                  disabled={isSearching}
                  className={`w-full text-on-primary px-8 py-4 rounded-lg text-lg font-black font-headline uppercase tracking-tighter transition-all duration-300 mb-3
                    ${isSearching
                      ? 'bg-surface-container-high opacity-60 cursor-not-allowed'
                      : 'ichor-gradient shadow-[0_0_30px_rgba(230,195,100,0.3)] hover:shadow-[0_0_50px_rgba(230,195,100,0.5)] active:scale-95'
                    }`}
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin material-symbols-outlined text-base">autorenew</span>
                      Démarrage...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">smart_toy</span>
                      Vs Bot
                    </span>
                  )}
                </button>

                {/* Vs Joueur */}
                <button
                  onClick={handleFindPvp}
                  disabled={pvpStatus === 'searching'}
                  className="w-full px-8 py-4 rounded-lg text-lg font-black font-headline uppercase tracking-tighter transition-all duration-300 bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary/30 hover:shadow-[0_0_30px_rgba(203,190,255,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">groups</span>
                    Vs Joueur
                  </span>
                </button>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/deck-builder')}
                className="p-4 bg-surface-container-highest rounded-xl border border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container-high transition-all text-left group"
              >
                <span className="material-symbols-outlined text-primary-container text-2xl group-hover:text-primary transition-colors">style</span>
                <p className="text-sm font-bold text-on-surface mt-2">Deck Builder</p>
                <p className="text-[10px] text-on-surface-variant">Armurerie</p>
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="p-4 bg-surface-container-highest rounded-xl border border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container-high transition-all text-left group"
              >
                <span className="material-symbols-outlined text-primary-container text-2xl group-hover:text-primary transition-colors">groups</span>
                <p className="text-sm font-bold text-on-surface mt-2">Classement</p>
                <p className="text-[10px] text-on-surface-variant">Panthéon</p>
              </button>
            </div>

            {/* Deck actuel */}
            <div className="glass-panel rounded-xl p-6 border border-outline-variant/20 relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-fixed mb-2 block">Deck actuel</span>
                {currentDeck ? (
                  <>
                    <h4 className="font-headline text-xl text-on-surface mb-2">{currentDeck.name}</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(deckCount / 10) * 100}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${currentDeck.isValid ? 'text-primary' : 'text-error'}`}>{deckCount}/10</span>
                    </div>
                    <button
                      onClick={() => navigate('/deck-builder')}
                      className="w-full py-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      Modifier le deck
                    </button>
                  </>
                ) : (
                  <>
                    <h4 className="font-headline text-base text-on-surface-variant mb-3">Aucun deck sélectionné</h4>
                    <button
                      onClick={() => navigate('/deck-builder')}
                      className="w-full py-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      Créer un deck
                    </button>
                  </>
                )}
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none">
                <span className="material-symbols-outlined text-8xl">style</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Matchmaking overlay */}
      {pvpStatus === 'searching' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-container-low rounded-xl border border-secondary/30 shadow-2xl p-10 text-center max-w-sm w-full mx-4">
            <div className="w-20 h-20 rounded-full bg-secondary/10 border-2 border-secondary/40 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <span className="material-symbols-outlined text-secondary text-4xl">groups</span>
            </div>
            <h3 className="font-headline text-2xl font-black text-secondary mb-2 uppercase tracking-widest">
              Recherche en cours
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">
              En attente d'un adversaire digne de ce nom...
            </p>
            <div className="flex justify-center gap-1.5 mb-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <button
              onClick={handleCancelPvp}
              className="w-full py-3 border border-outline-variant/30 text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-all font-bold uppercase tracking-widest text-xs"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
