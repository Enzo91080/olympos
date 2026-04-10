import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import type { GameCard } from '../store/gameStore'
import { useStatsStore } from '../store/statsStore'
import { useAuthStore } from '../store/authStore'
import { gameService } from '../services/gameService'

function FieldSlot({
  card,
  index,
  isPlayer,
  isSelected,
  isTargetable,
  onSelect,
  onTarget,
}: {
  card: GameCard | null
  isPlayer: boolean
  isSelected: boolean
  isTargetable: boolean
  onSelect?: () => void
  onTarget?: () => void
}) {
  const canClick = isPlayer ? !!card && !card.hasAttacked && !card.isSummoningSick : isTargetable

  return (
    <div
      className={`w-32 h-full rounded-lg transition-all duration-200 cursor-pointer
        ${card
          ? isPlayer
            ? `bg-surface-container-highest border-2 overflow-hidden shadow-xl
               ${isSelected ? 'border-primary shadow-[0_0_20px_rgba(230,195,100,0.6)] scale-105' : 'border-primary/40 hover:border-primary hover:scale-105'}
               ${(card.hasAttacked || card.isSummoningSick) ? 'opacity-50' : ''}`
            : `bg-surface-container-highest border-2 overflow-hidden shadow-xl
               ${isTargetable ? 'border-error/60 hover:border-error hover:scale-105 cursor-crosshair animate-pulse' : 'border-secondary/20'}`
          : isPlayer
            ? `border-2 border-dashed ${isTargetable ? 'border-primary animate-pulse bg-primary/10 hover:bg-primary/20' : 'border-primary/20 bg-primary-container/5'}`
            : 'border-2 border-dashed border-outline-variant/20 bg-surface-container-low/30'
        }`}
      onClick={canClick || isTargetable ? (isPlayer ? onSelect : onTarget) : undefined}
    >
      {card && (
        <div className="h-full flex flex-col relative">
          <div className="absolute inset-0 bg-surface-container-high opacity-70 flex items-center justify-center">
            {card.imageUrl
              ? <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
              : <span className="material-symbols-outlined text-primary-container text-4xl opacity-40">{isPlayer ? 'shield' : 'dark_mode'}</span>
            }
          </div>
          <div className="relative z-10 p-2 flex flex-col justify-between h-full">
            <p className={`text-[9px] font-bold uppercase tracking-tighter ${isPlayer ? 'text-primary' : 'text-secondary'}`}>
              {card.name}
            </p>
            <div className="flex justify-between">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px]">
                {card.attack ?? '—'}
              </div>
              <div className="w-6 h-6 rounded-full bg-error flex items-center justify-center text-on-error font-bold text-[10px]">
                {card.defense ?? '—'}
              </div>
            </div>
          </div>
          {card.isSummoningSick && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg z-20">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">hourglass_empty</span>
            </div>
          )}
          {card.hasAttacked && !card.isSummoningSick && (
            <div className="absolute top-0 right-0 p-1 z-20">
              <div className="w-3 h-3 rounded-full bg-outline-variant/60"></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GameBoard() {
  const navigate = useNavigate()
  useParams() // gameId available if needed later

  const {
    player, enemy, turn, battleLog, isPlayerTurn, winner, status,
    selectedHandIndex, selectedFieldIndex,
    gameId: storeGameId, botId,
    selectHandCard, playCard, selectFieldCard, attackEnemy, endTurn, reset,
  } = useGameStore()

  const { loadHistory } = useStatsStore()
  const { player: authPlayer } = useAuthStore()
  const resultRecorded = useRef(false)

  useEffect(() => {
    if (status === 'finished' && winner && !resultRecorded.current) {
      resultRecorded.current = true
      if (storeGameId && authPlayer) {
        const winnerId = winner === player.username ? authPlayer.id : (botId ?? '')
        gameService.finishSoloGame(storeGameId, winnerId).catch(() => {})
        loadHistory(authPlayer.id)
      }
    }
  }, [status, winner])

  const hasSelectedHand = selectedHandIndex !== null
  const hasSelectedField = selectedFieldIndex !== null
  const selectedCard = hasSelectedHand ? player.hand[selectedHandIndex!] : null
  const canAffordSelected = selectedCard ? selectedCard.manaCost <= player.mana : false

  // Determine if enemy slots are attackable
  const isEnemyTargetable = hasSelectedField

  const handleFieldClick = (index: number) => {
    if (hasSelectedHand && canAffordSelected) {
      playCard(selectedHandIndex!, index)
    } else {
      selectFieldCard(index)
    }
  }

  const handleEnemySlotClick = (index: number) => {
    if (hasSelectedField) {
      attackEnemy(selectedFieldIndex!, index)
    }
  }

  const handleEnemyHeroClick = () => {
    const hasEnemyCreatures = enemy.field.some((c) => c !== null)
    if (hasSelectedField && !hasEnemyCreatures) {
      attackEnemy(selectedFieldIndex!, 'hero')
    }
  }

  return (
    <div className="bg-background text-on-surface font-body overflow-hidden h-screen select-none">
      {/* Victory / Defeat overlay */}
      {status === 'finished' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-12 bg-surface-container-low rounded-xl border border-outline-variant/20 shadow-2xl">
            <h2 className={`font-headline text-6xl font-black mb-4 ${winner === player.username ? 'text-primary' : 'text-error'}`}>
              {winner === player.username ? 'VICTORY' : 'DEFEAT'}
            </h2>
            <p className="text-on-surface-variant mb-8">
              {winner === player.username ? 'The gods smile upon you, warrior.' : 'You have fallen. Rise again.'}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => { resultRecorded.current = false; reset() }} className="px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(230,195,100,0.4)] transition-all">
                Play Again
              </button>
              <button onClick={() => navigate('/dashboard')} className="px-8 py-3 border border-outline-variant/30 text-on-surface-variant font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-high transition-all">
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Log Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low/90 backdrop-blur-xl z-40 border-r border-outline-variant/20 flex flex-col shadow-[10px_0_30px_rgba(10,14,26,0.5)]">
        <div className="p-6">
          <h2 className="font-headline text-primary text-xl font-black tracking-widest uppercase">Archives</h2>
          <p className="text-xs text-on-surface-variant font-label tracking-tighter opacity-60">Chronicles of the Clash</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {battleLog.map((entry) => (
            <div key={entry.id} className={`p-3 rounded-lg border-l-2 ${entry.isEnemy ? 'bg-surface-container-highest/20 border-secondary/30' : 'bg-surface-container-highest/40 border-primary/40'}`}>
              <p className={`text-xs uppercase tracking-widest font-bold ${entry.isEnemy ? 'text-secondary' : 'text-primary'}`}>
                {entry.playerName}
              </p>
              <p className="text-sm text-on-surface">{entry.action}</p>
              {entry.detail && <p className="text-[10px] text-on-surface-variant mt-1 italic">{entry.detail}</p>}
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-outline-variant/20 bg-surface-container-lowest/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-on-primary">person</span>
            </div>
            <div>
              <p className="text-sm font-headline font-bold text-primary">{player.username}</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Rank: Olympian</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Board */}
      <main className="ml-72 h-full marble-bg relative flex flex-col items-center justify-between py-8 overflow-hidden">
        {/* Divider */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent -translate-y-1/2">
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rotate-45 border-2 border-primary/60 bg-surface flex items-center justify-center shadow-[0_0_20px_rgba(230,195,100,0.4)]">
            <span className="material-symbols-outlined text-primary -rotate-45 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
        </div>

        {/* Enemy Zone */}
        <div className="w-full flex flex-col items-center gap-4 z-10">
          {/* Enemy Stats */}
          <div
            className={`flex gap-12 items-center px-8 py-2 bg-surface-container-lowest/60 backdrop-blur-md rounded-full border shadow-xl transition-all
              ${isEnemyTargetable && !enemy.field.some(c => c !== null) ? 'border-error/60 cursor-crosshair animate-pulse' : 'border-outline-variant/10'}`}
            onClick={handleEnemyHeroClick}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              <span className="font-headline font-bold text-2xl text-on-surface">{enemy.hp}</span>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Enemy Mana</p>
              <div className="flex gap-1">
                {Array.from({ length: enemy.maxMana }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < enemy.mana ? 'bg-secondary shadow-[0_0_8px_#cbbeff]' : 'bg-surface-container-highest border border-outline-variant/30'}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">layers</span>
              <span className="font-headline font-bold text-xl text-on-surface">{enemy.deckSize}</span>
            </div>
          </div>

          {/* Enemy Field */}
          <div className="flex justify-center gap-4 w-full max-w-5xl h-44">
            {enemy.field.map((card, i) => (
              <FieldSlot
                key={i}
                card={card}

                isPlayer={false}
                isSelected={false}
                isTargetable={isEnemyTargetable && !!card}
                onTarget={() => handleEnemySlotClick(i)}
              />
            ))}
          </div>
        </div>

        {/* Player Zone */}
        <div className="w-full flex flex-col items-center gap-4 z-10">
          {/* Player Field */}
          <div className="flex justify-center gap-4 w-full max-w-5xl h-44">
            {player.field.map((card, i) => (
              <FieldSlot
                key={i}
                card={card}

                isPlayer={true}
                isSelected={selectedFieldIndex === i}
                isTargetable={hasSelectedHand && canAffordSelected && card === null}
                onSelect={() => handleFieldClick(i)}
                onTarget={() => handleFieldClick(i)}
              />
            ))}
          </div>

          {/* Player Hand */}
          <div className="relative w-full max-w-4xl flex justify-center h-48 mt-4">
            <div className="absolute bottom-0 flex items-end pb-2" style={{ gap: '8px' }}>
              {player.hand.map((card, i) => {
                const fanAngles = [-10, -5, 0, 5, 10, 15, -15]
                const fanY = [10, 2, -5, 2, 10, 16, 16]
                const isSelected = selectedHandIndex === i
                const canAfford = card.manaCost <= player.mana

                return (
                  <div
                    key={card.instanceId}
                    className={`w-28 h-40 rounded-lg border-2 relative cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-primary shadow-[0_0_25px_rgba(230,195,100,0.7)] -translate-y-8 scale-110 z-50'
                        : canAfford
                          ? 'border-primary/40 hover:border-primary hover:-translate-y-6 hover:scale-105 hover:z-40'
                          : 'border-outline-variant/20 opacity-50 cursor-not-allowed'
                      } bg-surface-container-highest`}
                    style={{
                      transform: isSelected
                        ? 'translateY(-32px) scale(1.1)'
                        : `rotate(${fanAngles[i] ?? 0}deg) translateY(${fanY[i] ?? 0}px)`,
                      zIndex: isSelected ? 50 : i + 10,
                    }}
                    onClick={() => canAfford && isPlayerTurn && selectHandCard(i)}
                  >
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      {card.imageUrl && (
                        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover opacity-60" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"></div>
                    </div>
                    <div className="relative z-10 p-2 flex flex-col h-full justify-between">
                      {/* Mana cost */}
                      <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center border border-primary/40">
                        <span className="font-headline font-bold text-primary text-xs">{card.manaCost}</span>
                      </div>
                      {/* Card info */}
                      <div>
                        <p className="text-[9px] font-bold text-primary uppercase tracking-tighter leading-tight">{card.name}</p>
                        {(card.attack !== undefined || card.defense !== undefined) && (
                          <div className="flex justify-between mt-1">
                            <span className="text-[8px] font-bold text-primary">{card.attack ?? '—'}</span>
                            <span className="text-[8px] font-bold text-error">{card.defense ?? '—'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-8 z-50">
          {/* Deck */}
          <div className="relative">
            <div className="w-20 h-28 bg-surface-container-lowest rounded border border-primary/40 shadow-xl flex items-center justify-center">
              <span className="font-headline font-bold text-primary text-2xl">{player.deckSize}</span>
            </div>
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border border-on-primary/20">
              <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>layers</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-2 text-center">Remaining</p>
          </div>

          {/* End Turn */}
          <button
            onClick={endTurn}
            disabled={!isPlayerTurn}
            className={`group relative px-8 py-5 rounded-lg transition-all active:scale-95 duration-300
              ${isPlayerTurn
                ? 'bg-gradient-to-b from-primary to-primary-container shadow-[0_0_40px_rgba(230,195,100,0.3)] hover:shadow-[0_0_60px_rgba(230,195,100,0.5)]'
                : 'bg-surface-container-high opacity-50 cursor-not-allowed'}`}
          >
            <div className="absolute inset-[2px] border border-on-primary/20 rounded-md"></div>
            <span className={`font-headline font-black text-lg tracking-[0.2em] uppercase relative z-10 ${isPlayerTurn ? 'text-on-primary' : 'text-on-surface-variant'}`}>
              {isPlayerTurn ? 'End Turn' : 'Enemy Turn'}
            </span>
          </button>

          {/* Player Stats */}
          <div className="flex flex-col gap-4 items-center p-5 bg-surface-container-highest/40 backdrop-blur-xl rounded-2xl border border-outline-variant/20 shadow-2xl">
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Divine Life</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                <span className={`font-headline font-bold text-4xl ${player.hp <= 10 ? 'text-error' : 'text-primary'}`}>{player.hp}</span>
              </div>
            </div>
            <div className="w-full h-[1px] bg-outline-variant/30"></div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Mana Pool</p>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-[100px]">
                {Array.from({ length: player.maxMana }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded rotate-45 border transition-all ${i < player.mana ? 'bg-secondary shadow-[0_0_12px_#cbbeff] border-white/40' : 'bg-surface-container-highest border-outline-variant/30'}`} />
                ))}
              </div>
              <p className="font-headline font-bold text-secondary text-lg">{player.mana} / {player.maxMana}</p>
            </div>
          </div>
        </div>

        {/* Hint banner */}
        {(hasSelectedHand || hasSelectedField) && (
          <div className="absolute bottom-56 left-1/2 -translate-x-1/2 z-50 px-6 py-2 bg-surface-container-low/90 backdrop-blur-md rounded-full border border-primary/30 text-sm text-primary font-bold uppercase tracking-widest animate-pulse">
            {hasSelectedHand && canAffordSelected && '→ Click an empty slot to play'}
            {hasSelectedHand && !canAffordSelected && '✗ Not enough mana'}
            {hasSelectedField && '→ Click an enemy to attack'}
          </div>
        )}

        {/* Floating Particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-primary rounded-full blur-[2px] opacity-40 animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-secondary rounded-full blur-[3px] opacity-30 animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-primary rounded-full blur-[2px] opacity-50 animate-pulse"></div>
        </div>
      </main>

      {/* Top Status Bar */}
      <header className="fixed top-0 right-0 left-72 bg-surface-container-lowest/40 backdrop-blur-md px-8 py-4 flex justify-between items-center z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Battle Phase</span>
            <span className="text-primary font-headline font-black text-lg">TURN {String(turn).padStart(2, '0')}</span>
          </div>
          <div className="h-8 w-[1px] bg-outline-variant/20"></div>
          <div className={`px-3 py-1 rounded border text-[10px] font-bold uppercase tracking-tighter transition-all ${isPlayerTurn ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/10 border-secondary/30 text-secondary'}`}>
            {isPlayerTurn ? 'Your Turn' : 'Enemy Turn...'}
          </div>
          {selectedCard && (
            <div className="px-3 py-1 rounded bg-surface-container-high border border-outline-variant/20">
              <span className="text-[10px] text-on-surface-variant">Selected: </span>
              <span className="text-[10px] text-primary font-bold">{selectedCard.name}</span>
              <span className="text-[10px] text-on-surface-variant"> ({selectedCard.manaCost} mana)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>
    </div>
  )
}
