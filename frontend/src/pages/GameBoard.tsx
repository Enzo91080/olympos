import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import type { GameCard } from '../store/gameStore'
import { useStatsStore } from '../store/statsStore'
import { useAuthStore } from '../store/authStore'
import { gameService } from '../services/gameService'
import { gameSocket } from '../socket/gameSocket'

function FieldSlot({
  card,
  isPlayer,
  isSelected,
  isTargetable,
  isEquipTarget,
  onSelect,
  onTarget,
}: {
  card: GameCard | null
  isPlayer: boolean
  isSelected: boolean
  isTargetable: boolean
  isEquipTarget?: boolean
  onSelect?: () => void
  onTarget?: () => void
}) {
  const canClick = isPlayer
    ? (isEquipTarget && !!card) || (!!card && !card.hasAttacked && !card.isSummoningSick)
    : isTargetable

  return (
    <div
      className={`w-32 h-full rounded-lg transition-all duration-200 cursor-pointer
        ${card
          ? isPlayer
            ? `bg-surface-container-highest border-2 overflow-hidden shadow-xl
               ${isSelected
                  ? 'border-primary shadow-[0_0_20px_rgba(230,195,100,0.6)] scale-105'
                  : isEquipTarget
                    ? 'border-secondary shadow-[0_0_20px_rgba(203,190,255,0.6)] animate-pulse hover:scale-105 cursor-crosshair'
                    : 'border-primary/40 hover:border-primary hover:scale-105'}
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
              <div className="relative group/atk flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px]">
                  {card.attack ?? '—'}
                </div>
                <span className="text-[7px] text-primary font-bold uppercase tracking-tighter leading-none mt-0.5">ATK</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/atk:block whitespace-nowrap bg-surface-container-low border border-primary/30 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full pointer-events-none z-50">
                  ⚔ Attaque
                </div>
              </div>
              <div className="relative group/def flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-error flex items-center justify-center text-on-error font-bold text-[10px]">
                  {card.defense ?? '—'}
                </div>
                <span className="text-[7px] text-error font-bold uppercase tracking-tighter leading-none mt-0.5">PV</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/def:block whitespace-nowrap bg-surface-container-low border border-error/30 text-error text-[9px] font-bold px-2 py-0.5 rounded-full pointer-events-none z-50">
                  ❤ Points de vie
                </div>
              </div>
            </div>
          </div>
          {card.isEquipped && (
            <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 px-1 py-0.5 bg-primary/90 rounded-full shadow-[0_0_8px_rgba(230,195,100,0.8)]">
              <span className="material-symbols-outlined text-on-primary text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              <span className="text-on-primary text-[7px] font-bold uppercase tracking-widest">Équipé</span>
            </div>
          )}
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
  useParams()
  const [searchParams] = useSearchParams()
  const isPvp = searchParams.get('pvp') === '1'

  const {
    player, enemy, turn, battleLog, isPlayerTurn, winner, status,
    selectedHandIndex, selectedFieldIndex,
    gameId: storeGameId, botId,
    mode, pvpMyPlayerId,
    selectHandCard, playCard, castSpell, selectFieldCard, attackEnemy, endTurn, reset,
    applyServerState, applyGameOver, clearSelection,
  } = useGameStore()

  const { loadHistory } = useStatsStore()
  const { player: authPlayer, token } = useAuthStore()
  const resultRecorded = useRef(false)
  const [showRules, setShowRules] = useState(false)
  const [pvpWaiting, setPvpWaiting] = useState(isPvp)
  // Floating HP deltas
  const [playerHpDelta, setPlayerHpDelta] = useState<number | null>(null)
  const [enemyHpDelta, setEnemyHpDelta] = useState<number | null>(null)
  const prevPlayerHp = useRef(player.hp)
  const prevEnemyHp = useRef(enemy.hp)

  // ─── PvP socket lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPvp || !storeGameId) return

    const sock = gameSocket.connect(token ?? '')

    gameSocket.onGameState((state: any) => {
      applyServerState(state)
      if (state.status === 'in_progress') setPvpWaiting(false)
    })

    gameSocket.onGameOver((data) => {
      applyGameOver(data.winnerId)
      setPvpWaiting(false)
    })

    gameSocket.joinGame(storeGameId)

    return () => {
      gameSocket.off('game_state')
      gameSocket.off('game_over')
      gameSocket.off('error')
    }
  }, [isPvp, storeGameId])

  useEffect(() => {
    const dp = player.hp - prevPlayerHp.current
    const de = enemy.hp - prevEnemyHp.current
    if (dp !== 0) { setPlayerHpDelta(dp); setTimeout(() => setPlayerHpDelta(null), 1500) }
    if (de !== 0) { setEnemyHpDelta(de); setTimeout(() => setEnemyHpDelta(null), 1500) }
    prevPlayerHp.current = player.hp
    prevEnemyHp.current = enemy.hp
  }, [player.hp, enemy.hp])

  // Redirect to dashboard if no game is active (e.g. direct URL access)
  useEffect(() => {
    if (status === 'idle') navigate('/dashboard', { replace: true })
  }, [])

  useEffect(() => {
    if (status === 'finished' && winner && !resultRecorded.current) {
      resultRecorded.current = true
      if (authPlayer) {
        if (mode === 'solo' && storeGameId) {
          const winnerId = winner === player.username ? authPlayer.id : (botId ?? '')
          gameService.finishSoloGame(storeGameId, winnerId).catch(() => {})
        }
        loadHistory(authPlayer.id)
      }
      if (isPvp) {
        gameSocket.off('game_state')
        gameSocket.off('game_over')
      }
    }
  }, [status, winner])

  const hasSelectedHand = selectedHandIndex !== null
  const hasSelectedField = selectedFieldIndex !== null
  const selectedCard = hasSelectedHand ? player.hand[selectedHandIndex!] : null
  const canAffordSelected = selectedCard ? selectedCard.manaCost <= player.mana : false

  const hasEnemyCreatures = enemy.field.some(c => c !== null)
  const hasEmptyPlayerSlot = player.field.some(c => c === null)

  // Tout le comportement des sorts vient du champ spellTarget en base de données
  const getSpellCastability = (spellTarget?: string): { ok: boolean; reason?: string } => {
    if (spellTarget === 'aoe_enemy' && !hasEnemyCreatures)
      return { ok: false, reason: 'Aucune créature ennemie à cibler' }
    if (spellTarget === 'summon' && !hasEmptyPlayerSlot)
      return { ok: false, reason: 'Votre terrain est plein' }
    return { ok: true }
  }

  const isSpell = !!selectedCard && selectedCard.cardType !== 'creature'
  // targeted / targeted_creature → cliquer créature/héros ennemi
  // equip → cliquer une créature alliée
  const isTargetedSpell = isSpell && (selectedCard!.spellTarget === 'targeted' || selectedCard!.spellTarget === 'targeted_creature')
  const isEquipSpell = isSpell && selectedCard!.spellTarget === 'equip'
  const isAutoSpell = isSpell && !isTargetedSpell && !isEquipSpell
  const autoSpellCastability = isAutoSpell ? getSpellCastability(selectedCard?.spellTarget) : { ok: true }

  const getBestCardIndex = (): number | null => {
    if (!isPlayerTurn || hasSelectedHand || hasSelectedField) return null
    let bestIndex: number | null = null
    let bestScore = -Infinity
    player.hand.forEach((card, i) => {
      if (card.manaCost > player.mana) return
      const spellOk = card.cardType === 'creature'
        || card.spellTarget === 'targeted'
        || card.spellTarget === 'targeted_creature'
        || getSpellCastability(card.spellTarget).ok
      if (!spellOk) return
      const score = (card.attack ?? 0) + (card.defense ?? 0) * 0.5 - card.manaCost * 0.2
      if (score > bestScore) { bestScore = score; bestIndex = i }
    })
    return bestIndex
  }
  const bestCardIndex = getBestCardIndex()

  const isEnemyTargetable = hasSelectedField || isTargetedSpell
  const heroTargetable = (hasSelectedField && !hasEnemyCreatures) || isTargetedSpell

  const handleFieldClick = (index: number) => {
    if (hasSelectedHand && canAffordSelected && selectedCard?.cardType === 'creature') {
      if (isPvp) {
        gameSocket.playCard(storeGameId!, selectedCard!.id)
        clearSelection()
      } else {
        playCard(selectedHandIndex!, index)
      }
    } else if (hasSelectedHand && canAffordSelected && isEquipSpell && player.field[index]) {
      if (!isPvp) castSpell(selectedHandIndex!, index)
      else clearSelection() // equip not supported in PvP
    } else if (!isSpell) {
      selectFieldCard(index)
    }
  }

  const handleEnemySlotClick = (index: number) => {
    if (hasSelectedField) {
      if (isPvp) {
        const attacker = player.field[selectedFieldIndex!]
        const target = enemy.field[index]
        if (attacker && target) {
          gameSocket.attack(storeGameId!, { attackerInstanceId: attacker.instanceId, targetType: 'creature', targetInstanceId: target.instanceId })
          clearSelection()
        }
      } else {
        attackEnemy(selectedFieldIndex!, index)
      }
    } else if (isTargetedSpell && enemy.field[index]) {
      if (isPvp) {
        const target = enemy.field[index]
        if (target) {
          gameSocket.playCard(storeGameId!, selectedCard!.id, { targetId: target.instanceId, targetType: 'creature' })
          clearSelection()
        }
      } else {
        castSpell(selectedHandIndex!, index)
      }
    }
  }

  const handleEnemyHeroClick = () => {
    const noEnemyCreatures = !enemy.field.some((c) => c !== null)
    if (hasSelectedField && noEnemyCreatures) {
      if (isPvp) {
        const attacker = player.field[selectedFieldIndex!]
        if (attacker) {
          gameSocket.attack(storeGameId!, { attackerInstanceId: attacker.instanceId, targetType: 'player' })
          clearSelection()
        }
      } else {
        attackEnemy(selectedFieldIndex!, 'hero')
      }
    } else if (isTargetedSpell) {
      if (isPvp) {
        gameSocket.playCard(storeGameId!, selectedCard!.id, { targetId: 'hero', targetType: 'hero' })
        clearSelection()
      } else {
        castSpell(selectedHandIndex!, 'hero')
      }
    }
  }

  const handleCastAutoSpell = () => {
    if (hasSelectedHand && isAutoSpell && canAffordSelected && autoSpellCastability.ok) {
      if (isPvp) {
        gameSocket.playCard(storeGameId!, selectedCard!.id)
        clearSelection()
      } else {
        castSpell(selectedHandIndex!, null)
      }
    }
  }

  const handleEndTurn = () => {
    if (isPvp) {
      gameSocket.endTurn(storeGameId!)
    } else {
      endTurn()
    }
  }

  return (
    <div className="bg-background text-on-surface font-body overflow-hidden h-screen select-none">

      {/* ── Modal Règles ─────────────────────────────────────────────────── */}
      {showRules && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowRules(false)}>
          <div className="w-full max-w-md bg-surface-container-low rounded-xl border border-primary/20 shadow-2xl p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-black text-primary uppercase tracking-widest">Règles du jeu</h2>
              <button onClick={() => setShowRules(false)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 text-sm text-on-surface">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5">favorite</span>
                <p><span className="text-primary font-bold">Objectif :</span> Réduire les PV de l'adversaire à 0. Chaque joueur commence avec <span className="text-primary font-bold">20 PV</span>.</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-secondary flex-shrink-0 mt-0.5">water_drop</span>
                <p><span className="text-primary font-bold">Mana :</span> Tu gagnes 1 mana supplémentaire par tour (max 10). Le mana se recharge totalement à chaque tour.</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">smart_toy</span>
                <p><span className="text-primary font-bold">Créatures :</span> Clique une carte → clique une case vide pour la poser. Elle ne peut <span className="text-error font-bold">pas attaquer</span> le tour où elle est posée.</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0 mt-0.5">swords</span>
                <p><span className="text-primary font-bold">Attaquer :</span> Clique une de tes créatures → clique une créature ennemie. Si le terrain adverse est <span className="text-primary font-bold">vide</span>, tu peux attaquer directement le héros.</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-secondary flex-shrink-0 mt-0.5">auto_fix_high</span>
                <p><span className="text-primary font-bold">Sorts & Artefacts :</span> Clique la carte, puis suis l'indication en bas de l'écran (cibler un ennemi, une créature alliée, ou appuyer sur « Lancer »).</p>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0 mt-0.5">skip_next</span>
                <p><span className="text-primary font-bold">Fin de tour :</span> Appuie sur le bouton doré à droite pour passer la main. Tu pioches une carte et ton mana se recharge.</p>
              </div>
            </div>
            <button onClick={() => setShowRules(false)} className="mt-6 w-full py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-lg uppercase tracking-widest text-sm hover:opacity-90 transition-all">
              Compris !
            </button>
          </div>
        </div>
      )}

      {/* ── PvP : attente de l'adversaire ───────────────────────────────── */}
      {isPvp && pvpWaiting && status !== 'finished' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center p-10 bg-surface-container-low rounded-xl border border-secondary/30 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-secondary/10 border-2 border-secondary/40 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="material-symbols-outlined text-secondary text-3xl">groups</span>
            </div>
            <p className="font-headline text-secondary text-xl font-black uppercase tracking-widest mb-2">Connexion en cours</p>
            <p className="text-on-surface-variant text-sm">En attente de {enemy.username}...</p>
          </div>
        </div>
      )}

      {/* ── Victoire / Défaite ────────────────────────────────────────────── */}
      {status === 'finished' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-12 bg-surface-container-low rounded-xl border border-outline-variant/20 shadow-2xl">
            <h2 className={`font-headline text-6xl font-black mb-4 ${winner === player.username ? 'text-primary' : 'text-error'}`}>
              {winner === player.username ? 'VICTOIRE' : 'DÉFAITE'}
            </h2>
            <p className="text-on-surface-variant mb-8">
              {winner === player.username ? 'Les dieux te sourient, guerrier.' : 'Tu es tombé. Relève-toi.'}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => { resultRecorded.current = false; reset(); if (isPvp) navigate('/dashboard') }} className="px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(230,195,100,0.4)] transition-all">
                {isPvp ? 'Retour' : 'Rejouer'}
              </button>
              <button onClick={() => navigate('/dashboard')} className="px-8 py-3 border border-outline-variant/30 text-on-surface-variant font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-high transition-all">
                Accueil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Log Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low/90 backdrop-blur-xl z-40 border-r border-outline-variant/20 flex flex-col shadow-[10px_0_30px_rgba(10,14,26,0.5)]">
        <div className="p-6">
          <h2 className="font-headline text-primary text-xl font-black tracking-widest uppercase">Journal</h2>
          <p className="text-xs text-on-surface-variant font-label tracking-tighter opacity-60">Chronique de la bataille</p>
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
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Rang : Olympien</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Board */}
      <main className="ml-72 h-full marble-bg relative flex flex-col items-center justify-between pt-20 pb-4 overflow-hidden">
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
            className={`self-start ml-6 flex gap-8 items-center px-6 py-2 bg-surface-container-lowest/60 backdrop-blur-md rounded-full border shadow-xl transition-all
              ${heroTargetable ? 'border-error/60 cursor-crosshair animate-pulse' : 'border-outline-variant/10'}`}
            onClick={handleEnemyHeroClick}
          >
            <div className="flex flex-col items-center relative">
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-0.5">PV ennemi</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-error text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <span className="font-headline font-bold text-2xl text-on-surface">{enemy.hp}</span>
              </div>
              {enemyHpDelta !== null && (
                <span className={`absolute -top-6 left-1/2 -translate-x-1/2 font-headline font-black text-lg animate-bounce pointer-events-none ${enemyHpDelta < 0 ? 'text-error' : 'text-primary'}`}>
                  {enemyHpDelta > 0 ? `+${enemyHpDelta}` : enemyHpDelta} PV
                </span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Mana ennemi</p>
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
          {/* Player Stats */}
          <div className="self-start ml-6 flex gap-8 items-center px-6 py-2 bg-surface-container-lowest/60 backdrop-blur-md rounded-full border border-outline-variant/10 shadow-xl">
            <div className="flex flex-col items-center relative">
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-0.5">Tes PV</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <span className="font-headline font-bold text-2xl text-on-surface">{player.hp}</span>
              </div>
              {playerHpDelta !== null && (
                <span className={`absolute -top-6 left-1/2 -translate-x-1/2 font-headline font-black text-lg animate-bounce pointer-events-none ${playerHpDelta < 0 ? 'text-error' : 'text-primary'}`}>
                  {playerHpDelta > 0 ? `+${playerHpDelta}` : playerHpDelta} PV
                </span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Ton mana</p>
              <div className="flex gap-1">
                {Array.from({ length: player.maxMana }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < player.mana ? 'bg-secondary shadow-[0_0_8px_#cbbeff]' : 'bg-surface-container-highest border border-outline-variant/30'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Player Field */}
          <div className="flex justify-center gap-4 w-full max-w-5xl h-44">
            {player.field.map((card, i) => (
              <FieldSlot
                key={i}
                card={card}
                isPlayer={true}
                isSelected={selectedFieldIndex === i}
                isTargetable={hasSelectedHand && canAffordSelected && !isEquipSpell && card === null}
                isEquipTarget={hasSelectedHand && canAffordSelected && isEquipSpell && !!card}
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
                const isBest = bestCardIndex === i
                const canAfford = card.manaCost <= player.mana
                const spellOk = card.cardType === 'creature'
                  || card.spellTarget === 'targeted'
                  || card.spellTarget === 'targeted_creature'
                  || getSpellCastability(card.spellTarget).ok
                const isPlayable = canAfford && spellOk

                return (
                  <div
                    key={card.instanceId}
                    className={`w-28 h-40 rounded-lg border-2 relative cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-primary shadow-[0_0_25px_rgba(230,195,100,0.7)] -translate-y-8 scale-110 z-50'
                        : isBest
                          ? 'border-primary shadow-[0_0_20px_rgba(230,195,100,0.6),0_0_40px_rgba(230,195,100,0.3)] animate-pulse hover:-translate-y-6 hover:scale-105 hover:z-40'
                          : isPlayable
                            ? 'border-primary/40 hover:border-primary hover:-translate-y-6 hover:scale-105 hover:z-40'
                            : canAfford
                              ? 'border-error/20 opacity-40 cursor-not-allowed'
                              : 'border-outline-variant/20 opacity-50 cursor-not-allowed'
                      } bg-surface-container-highest`}
                    style={{
                      transform: isSelected
                        ? 'translateY(-32px) scale(1.1)'
                        : `rotate(${fanAngles[i] ?? 0}deg) translateY(${fanY[i] ?? 0}px)`,
                      zIndex: isSelected ? 50 : i + 10,
                    }}
                    onClick={() => isPlayable && isPlayerTurn && selectHandCard(i)}
                  >
                    {isBest && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-60 whitespace-nowrap px-2 py-0.5 bg-primary text-on-primary text-[8px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                        ✦ Meilleur coup
                      </div>
                    )}
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
                        {/* Type badge */}
                        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full mb-1 ${
                          card.cardType === 'creature'
                            ? 'bg-primary/20 text-primary'
                            : card.cardType === 'spell'
                              ? 'bg-secondary/20 text-secondary'
                              : 'bg-tertiary/20 text-tertiary'
                        }`}>
                          <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {card.cardType === 'creature' ? 'smart_toy' : card.cardType === 'spell' ? 'auto_fix_high' : 'shield'}
                          </span>
                          <span className="text-[7px] font-bold uppercase tracking-widest">
                            {card.cardType === 'creature' ? 'Créature' : card.cardType === 'spell' ? 'Sort' : 'Artefact'}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-primary uppercase tracking-tighter leading-tight">{card.name}</p>
                        {(card.attack !== undefined || card.defense !== undefined) && (
                          <div className="flex justify-between mt-1">
                            <span className="text-[8px] font-bold text-primary" title="Attaque">⚔ {card.attack ?? '—'}</span>
                            <span className="text-[8px] font-bold text-error" title="Défense">🛡 {card.defense ?? '—'}</span>
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
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-2 text-center">Deck</p>
          </div>

          {/* End Turn */}
          <button
            onClick={handleEndTurn}
            disabled={!isPlayerTurn}
            className={`group relative px-8 py-5 rounded-lg transition-all active:scale-95 duration-300
              ${isPlayerTurn
                ? 'bg-gradient-to-b from-primary to-primary-container shadow-[0_0_40px_rgba(230,195,100,0.3)] hover:shadow-[0_0_60px_rgba(230,195,100,0.5)]'
                : 'bg-surface-container-high opacity-50 cursor-not-allowed'}`}
          >
            <div className="absolute inset-[2px] border border-on-primary/20 rounded-md"></div>
            <span className={`font-headline font-black text-lg tracking-[0.2em] uppercase relative z-10 ${isPlayerTurn ? 'text-on-primary' : 'text-on-surface-variant'}`}>
              {isPlayerTurn ? 'Fin du tour' : 'Tour ennemi'}
            </span>
          </button>

          {/* Player Stats */}
          <div className="flex flex-col gap-4 items-center p-5 bg-surface-container-highest/40 backdrop-blur-xl rounded-2xl border border-outline-variant/20 shadow-2xl">
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Points de vie</p>
              <div className="flex items-center gap-2 relative">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                <span className={`font-headline font-bold text-4xl ${player.hp <= 10 ? 'text-error' : 'text-primary'}`}>{player.hp}</span>
                {playerHpDelta !== null && (
                  <span className={`absolute -top-7 left-1/2 -translate-x-1/2 font-headline font-black text-xl animate-bounce pointer-events-none whitespace-nowrap ${playerHpDelta < 0 ? 'text-error' : 'text-primary'}`}>
                    {playerHpDelta > 0 ? `+${playerHpDelta}` : playerHpDelta} PV
                  </span>
                )}
              </div>
            </div>
            <div className="w-full h-[1px] bg-outline-variant/30"></div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Mana</p>
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
          <div className="absolute bottom-56 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 px-6 py-2.5 bg-surface-container-low/95 backdrop-blur-md rounded-2xl border border-primary/30 shadow-xl max-w-md text-center">
            {selectedCard?.effectText && (
              <p className="text-[11px] text-on-surface-variant italic leading-snug">
                {selectedCard.effectText}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-primary font-bold uppercase tracking-widest animate-pulse">
              {hasSelectedHand && !canAffordSelected && '✗ Mana insuffisant'}
              {hasSelectedHand && canAffordSelected && isTargetedSpell && '→ Clique un ennemi pour lancer'}
              {hasSelectedHand && canAffordSelected && isAutoSpell && autoSpellCastability.ok && (
                <>
                  <span>{selectedCard?.name}</span>
                  <button onClick={handleCastAutoSpell} className="px-3 py-1 bg-primary text-on-primary rounded-full text-xs animate-none hover:opacity-80">
                    Lancer ✦
                  </button>
                </>
              )}
              {hasSelectedHand && canAffordSelected && isAutoSpell && !autoSpellCastability.ok && (
                <span className="text-error">✗ {autoSpellCastability.reason}</span>
              )}
              {hasSelectedHand && canAffordSelected && isEquipSpell && '→ Clique une de tes créatures pour équiper'}
              {hasSelectedHand && canAffordSelected && !isSpell && '→ Clique une case vide pour invoquer'}
              {hasSelectedField && '→ Clique un ennemi pour attaquer'}
            </div>
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
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Phase de combat</span>
            <span className="text-primary font-headline font-black text-lg">TOUR {String(turn).padStart(2, '0')}</span>
          </div>
          <div className="h-8 w-[1px] bg-outline-variant/20"></div>
          <div className={`px-3 py-1 rounded border text-[10px] font-bold uppercase tracking-tighter transition-all ${isPlayerTurn ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/10 border-secondary/30 text-secondary'}`}>
            {isPlayerTurn ? 'Ton tour' : 'Tour ennemi...'}
          </div>
          {selectedCard && (
            <div className="px-3 py-1 rounded bg-surface-container-high border border-outline-variant/20">
              <span className="text-[10px] text-on-surface-variant">Sélectionné : </span>
              <span className="text-[10px] text-primary font-bold">{selectedCard.name}</span>
              <span className="text-[10px] text-on-surface-variant"> ({selectedCard.manaCost} mana)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowRules(true)}
            title="Règles du jeu"
            className="w-9 h-9 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
          >
            ?
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
