import { create } from 'zustand'
import type { BackendCard, SoloGameResponse } from '../services/gameService'

export interface GameCard {
  id: string
  instanceId: string
  name: string
  cardType: string
  manaCost: number
  attack?: number
  defense?: number
  effectText?: string
  rarity?: string
  imageUrl?: string
  spellTarget?: string
  hasAttacked?: boolean
  isSummoningSick?: boolean
  isEquipped?: boolean
}

export interface PlayerState {
  id: string
  username: string
  hp: number
  mana: number
  maxMana: number
  deckSize: number
  field: (GameCard | null)[]
  hand: GameCard[]
}

export interface BattleLogEntry {
  id: string
  playerName: string
  action: string
  detail?: string
  isEnemy?: boolean
}

export interface PvpMatchedData {
  gameId: string
  opponentId: string
  opponentUsername: string
  isFirstPlayer: boolean
  player: {
    hand: BackendCard[]
    deckRemaining: BackendCard[]
  }
}

interface GameState {
  gameId: string | null
  botId: string | null
  status: 'idle' | 'in_progress' | 'finished'
  turn: number
  isPlayerTurn: boolean
  player: PlayerState
  enemy: PlayerState
  playerDeckRemaining: GameCard[]
  enemyDeckRemaining: GameCard[]
  battleLog: BattleLogEntry[]
  winner: string | null
  selectedHandIndex: number | null
  selectedFieldIndex: number | null
  mode: 'solo' | 'pvp'
  pvpMyPlayerId: string | null
  cardLookup: Record<string, GameCard>

  startGame: (data: SoloGameResponse, authPlayerId: string, authUsername: string) => void
  startPvpGame: (data: PvpMatchedData, myPlayerId: string, myUsername: string, cardLookup: Record<string, GameCard>) => void
  applyServerState: (serverState: any) => void
  applyGameOver: (winnerId: string) => void
  clearSelection: () => void
  selectHandCard: (index: number) => void
  playCard: (handIndex: number, slotIndex: number) => void
  castSpell: (handIndex: number, target: number | 'hero' | null) => void
  selectFieldCard: (index: number) => void
  attackEnemy: (playerFieldIndex: number, target: number | 'hero') => void
  endTurn: () => void
  reset: () => void
}

const makeId = () => Math.random().toString(36).slice(2, 9)

export function toGameCard(card: BackendCard): GameCard {
  return {
    id: card.id,
    instanceId: makeId(),
    name: card.name,
    cardType: card.cardType,
    manaCost: card.manaCost,
    attack: card.attack ?? undefined,
    defense: card.defense ?? undefined,
    effectText: card.effectText ?? undefined,
    rarity: card.rarity,
    imageUrl: card.imageUrl ?? undefined,
    spellTarget: card.spellTarget ?? undefined,
    hasAttacked: false,
    isSummoningSick: false,
  }
}

function addLog(logs: BattleLogEntry[], entry: Omit<BattleLogEntry, 'id'>): BattleLogEntry[] {
  return [{ ...entry, id: makeId() }, ...logs].slice(0, 40)
}

const EMPTY_PLAYER: PlayerState = {
  id: '',
  username: '',
  hp: 20,
  mana: 1,
  maxMana: 1,
  deckSize: 0,
  field: [null, null, null, null, null, null],
  hand: [],
}

function simulateEnemyTurn(
  state: Pick<GameState, 'enemy' | 'player' | 'battleLog' | 'turn' | 'enemyDeckRemaining'>,
): Partial<GameState> {
  const newMaxMana = Math.min(state.turn - 1, 10)
  let enemy = {
    ...state.enemy,
    mana: newMaxMana,
    maxMana: newMaxMana,
    hand: [...state.enemy.hand],
    field: [...state.enemy.field],
  }
  let player = { ...state.player, field: [...state.player.field] }
  let logs = [...state.battleLog]
  let enemyDeckRemaining = [...state.enemyDeckRemaining]

  // Draw a card — fatigue si deck vide
  if (enemyDeckRemaining.length > 0) {
    const drawn = { ...enemyDeckRemaining[0], instanceId: makeId(), hasAttacked: false, isSummoningSick: true }
    enemy.hand = [...enemy.hand, drawn]
    enemyDeckRemaining = enemyDeckRemaining.slice(1)
    enemy.deckSize = enemyDeckRemaining.length
  } else if (enemy.hand.length === 0 && enemy.field.every(c => c === null)) {
    // Plus de deck, plus de main, plus de terrain → défaite immédiate
    return {
      player: state.player,
      enemy: { ...enemy, hp: 0 },
      enemyDeckRemaining,
      battleLog: addLog(state.battleLog, { playerName: enemy.username, action: 'Plus aucune carte — défaite !', isEnemy: true }),
      winner: state.player.username,
      status: 'finished',
      isPlayerTurn: true,
      selectedHandIndex: null,
      selectedFieldIndex: null,
    }
  }

  // Reset board canAttack (new turn)
  enemy.field = enemy.field.map((c) => c ? { ...c, hasAttacked: false, isSummoningSick: false } : null)

  // Play a creature from hand — bot skips 30% of the time
  if (Math.random() > 0.30) {
    const creatureInHand = enemy.hand.find(
      (c) => c.cardType === 'creature' && c.manaCost <= enemy.mana
    )
    if (creatureInHand) {
      const emptySlot = enemy.field.findIndex((s) => s === null)
      if (emptySlot !== -1) {
        const newField = [...enemy.field]
        newField[emptySlot] = { ...creatureInHand, isSummoningSick: true, hasAttacked: false }
        enemy.field = newField
        enemy.hand = enemy.hand.filter((c) => c.instanceId !== creatureInHand.instanceId)
        enemy.mana -= creatureInHand.manaCost
        logs = addLog(logs, { playerName: enemy.username, action: `Invoque ${creatureInHand.name}`, isEnemy: true })
      }
    }
  }

  // Attack with at most 1 creature per turn — 40% miss chance
  const allAttackers = enemy.field.filter((c): c is GameCard => c !== null && !c.isSummoningSick && !c.hasAttacked)
  const attackers = allAttackers.slice(0, 1)
  for (const attacker of attackers) {
    if (Math.random() < 0.40) continue // bot misses 40% of its attacks
    const playerCreature = player.field.find((c): c is GameCard => c !== null)
    if (playerCreature) {
      const newDef = (playerCreature.defense ?? 0) - (attacker.attack ?? 0)
      const attackerDef = (attacker.defense ?? 0) - (playerCreature.attack ?? 0)

      // Update player field
      const pidx = player.field.findIndex((c) => c?.instanceId === playerCreature.instanceId)
      const pf = [...player.field]
      pf[pidx] = newDef <= 0 ? null : { ...playerCreature, defense: newDef }
      player.field = pf

      // Update enemy attacker
      const eidx = enemy.field.findIndex((c) => c?.instanceId === attacker.instanceId)
      const ef = [...enemy.field]
      ef[eidx] = attackerDef <= 0 ? null : { ...attacker, defense: attackerDef, hasAttacked: true }
      enemy.field = ef

      logs = addLog(logs, {
        playerName: enemy.username,
        action: newDef <= 0
          ? `${attacker.name} détruit ${playerCreature.name}`
          : `${attacker.name} attaque ${playerCreature.name}`,
        isEnemy: true,
      })
    } else {
      // Direct attack on hero
      const dmg = attacker.attack ?? 0
      player = { ...player, hp: Math.max(0, player.hp - dmg) }
      const eidx = enemy.field.findIndex((c) => c?.instanceId === attacker.instanceId)
      const ef = [...enemy.field]
      ef[eidx] = { ...attacker, hasAttacked: true }
      enemy.field = ef
      logs = addLog(logs, { playerName: enemy.username, action: `${attacker.name} inflige ${dmg} dégâts à ton héros`, isEnemy: true })
    }
  }

  const winner = player.hp <= 0 ? enemy.username : null

  return {
    player,
    enemy,
    enemyDeckRemaining,
    battleLog: logs,
    winner,
    status: winner ? 'finished' : 'in_progress',
    isPlayerTurn: true,
    selectedHandIndex: null,
    selectedFieldIndex: null,
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  botId: null,
  status: 'idle',
  turn: 1,
  isPlayerTurn: true,
  player: EMPTY_PLAYER,
  enemy: EMPTY_PLAYER,
  playerDeckRemaining: [],
  enemyDeckRemaining: [],
  battleLog: [],
  winner: null,
  selectedHandIndex: null,
  selectedFieldIndex: null,
  mode: 'solo',
  pvpMyPlayerId: null,
  cardLookup: {},

  startGame: (data, authPlayerId, authUsername) => {
    let playerHand = data.player.hand.map(toGameCard)
    let playerDeck = data.player.deckRemaining.map(toGameCard)
    const botHand = data.bot.hand.map(toGameCard)
    const botDeck = data.bot.deckRemaining.map(toGameCard)

    // Guarantee at least one creature with manaCost ≤ 1 in starting hand
    // so the player always has something to do on turn 1
    const hasOneManaCreature = playerHand.some(c => c.manaCost <= 1 && c.cardType === 'creature')
    if (!hasOneManaCreature) {
      const deckIdx = playerDeck.findIndex(c => c.manaCost <= 1 && c.cardType === 'creature')
      if (deckIdx !== -1) {
        const replacement = { ...playerDeck[deckIdx], instanceId: makeId() }
        // Swap out the most expensive hand card
        const handIdx = playerHand.reduce((max, c, i) => c.manaCost > playerHand[max].manaCost ? i : max, 0)
        playerDeck = [...playerDeck]
        playerDeck[deckIdx] = playerHand[handIdx]
        playerHand = [...playerHand]
        playerHand[handIdx] = replacement
      }
    }

    set({
      gameId: data.gameId,
      botId: data.botId,
      status: 'in_progress',
      turn: 1,
      isPlayerTurn: true,
      winner: null,
      selectedHandIndex: null,
      selectedFieldIndex: null,
      playerDeckRemaining: playerDeck,
      enemyDeckRemaining: botDeck,
      battleLog: [{ id: makeId(), playerName: 'Système', action: 'La bataille commence ! Que les dieux te favorisent.', isEnemy: false }],
      player: {
        id: authPlayerId,
        username: authUsername,
        hp: 25,
        mana: 1,
        maxMana: 1,
        deckSize: playerDeck.length,
        field: [null, null, null, null, null, null],
        hand: playerHand,
      },
      enemy: {
        id: data.botId,
        username: data.botUsername,
        hp: 15,
        mana: 0,
        maxMana: 0,
        deckSize: botDeck.length,
        field: [null, null, null, null, null, null],
        hand: botHand,
      },
    })
  },

  selectHandCard: (index) => {
    const { isPlayerTurn, selectedHandIndex } = get()
    if (!isPlayerTurn) return
    set({ selectedHandIndex: selectedHandIndex === index ? null : index, selectedFieldIndex: null })
  },

  playCard: (handIndex, slotIndex) => {
    const { player, battleLog, isPlayerTurn } = get()
    if (!isPlayerTurn) return
    const card = player.hand[handIndex]
    if (!card || card.cardType !== 'creature') return
    if (player.field[slotIndex] !== null) return
    if (card.manaCost > player.mana) return

    const newHand = player.hand.filter((_, i) => i !== handIndex)
    const newField = [...player.field]
    newField[slotIndex] = { ...card, hasAttacked: false, isSummoningSick: true }

    const logs = addLog(battleLog, {
      playerName: player.username,
      action: `Invoque ${card.name}`,
      detail: card.effectText ?? undefined,
    })

    set({
      player: { ...player, hand: newHand, field: newField, mana: player.mana - card.manaCost },
      battleLog: logs,
      selectedHandIndex: null,
      selectedFieldIndex: null,
    })
  },

  castSpell: (handIndex, target) => {
    const { player, enemy, battleLog, isPlayerTurn } = get()
    if (!isPlayerTurn) return
    const card = player.hand[handIndex]
    if (!card || card.manaCost > player.mana) return

    const newHand = player.hand.filter((_, i) => i !== handIndex)
    let newPlayer = { ...player, hand: newHand, mana: player.mana - card.manaCost }
    let newEnemy = { ...enemy, field: [...enemy.field] }
    let logs = battleLog
    const st = card.spellTarget
    const power = card.attack ?? 0       // puissance offensive (dégâts)
    const bonusDef = card.defense ?? 0   // puissance défensive (soin / défense)

    if (st === 'equip' && typeof target === 'number') {
      // Artefact équipé → créature alliée ciblée (doit passer avant le check générique number)
      const ally = newPlayer.field[target]
      if (ally) {
        const pf = [...newPlayer.field]
        pf[target] = { ...ally, attack: (ally.attack ?? 0) + power, defense: (ally.defense ?? 0) + bonusDef, isSummoningSick: false, isEquipped: true }
        newPlayer = { ...newPlayer, field: pf }
        logs = addLog(logs, { playerName: player.username, action: `${card.name} équipe ${ally.name} (+${power || 0}/+${bonusDef || 0})`, detail: card.effectText ?? undefined })
      }
    } else if (target === 'hero') {
      // Sort ciblé → héros ennemi
      newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - power) }
      logs = addLog(logs, { playerName: player.username, action: `${card.name} inflige ${power} dégâts à ${enemy.username}`, detail: card.effectText ?? undefined })
    } else if (typeof target === 'number') {
      // Sort ciblé → créature ennemie
      const targetCard = enemy.field[target]
      if (!targetCard) return
      const newDef = (targetCard.defense ?? 0) - power
      const ef = [...enemy.field]
      ef[target] = newDef <= 0 ? null : { ...targetCard, defense: newDef }
      newEnemy = { ...newEnemy, field: ef }
      logs = addLog(logs, { playerName: player.username, action: newDef <= 0 ? `${card.name} détruit ${targetCard.name}` : `${card.name} inflige ${power} dégâts à ${targetCard.name}`, detail: card.effectText ?? undefined })
    } else if (st === 'aoe_enemy') {
      // Dégâts à toutes les créatures ennemies (power = dégâts par créature)
      const ef = enemy.field.map(c => { if (!c) return null; const nd = (c.defense ?? 0) - power; return nd <= 0 ? null : { ...c, defense: nd } })
      newEnemy = { ...newEnemy, field: ef }
      logs = addLog(logs, { playerName: player.username, action: `${card.name} inflige ${power} dégâts à toutes les créatures ennemies`, detail: card.effectText ?? undefined })
    } else if (st === 'self') {
      // Soin / buff joueur (attack = soin, defense = bonus défense pour créatures)
      if (power > 0) newPlayer = { ...newPlayer, hp: Math.min(20, newPlayer.hp + power) }
      if (bonusDef > 0) {
        const pf = newPlayer.field.map(c => c ? { ...c, defense: (c.defense ?? 0) + bonusDef } : null)
        newPlayer = { ...newPlayer, field: pf }
      }
      logs = addLog(logs, { playerName: player.username, action: `${card.name} joué`, detail: card.effectText ?? undefined })
    } else if (st === 'summon') {
      // Invocation (attack / defense = stats de la créature invoquée)
      const slot = newPlayer.field.findIndex(s => s === null)
      if (slot !== -1) {
        const summoned: GameCard = { id: makeId(), instanceId: makeId(), name: 'Serviteur', cardType: 'creature', manaCost: 1, attack: power || 1, defense: bonusDef || 2, rarity: 'common', hasAttacked: false, isSummoningSick: true }
        const pf = [...newPlayer.field]; pf[slot] = summoned
        newPlayer = { ...newPlayer, field: pf }
        logs = addLog(logs, { playerName: player.username, action: `${card.name} invoque un ${summoned.name} (${summoned.attack}/${summoned.defense})`, detail: card.effectText ?? undefined })
      }
    } else {
      logs = addLog(logs, { playerName: player.username, action: `${card.name} joué`, detail: card.effectText ?? undefined })
    }

    const winner = newEnemy.hp <= 0 ? player.username : null
    set({ player: newPlayer, enemy: newEnemy, battleLog: logs, winner, status: winner ? 'finished' : 'in_progress', selectedHandIndex: null, selectedFieldIndex: null })
  },

  selectFieldCard: (index) => {
    const { isPlayerTurn, player, selectedFieldIndex } = get()
    if (!isPlayerTurn) return
    const card = player.field[index]
    if (!card || card.hasAttacked || card.isSummoningSick) return
    set({ selectedFieldIndex: selectedFieldIndex === index ? null : index, selectedHandIndex: null })
  },

  attackEnemy: (playerFieldIndex, target) => {
    const { player, enemy, battleLog, isPlayerTurn } = get()
    if (!isPlayerTurn) return
    const attacker = player.field[playerFieldIndex]
    if (!attacker || attacker.hasAttacked || attacker.isSummoningSick) return

    const dmg = attacker.attack ?? 0
    let logs = battleLog
    let newEnemy = { ...enemy, field: [...enemy.field] }
    let newPlayer = { ...player, field: [...player.field] }

    if (target === 'hero') {
      newEnemy.hp = Math.max(0, enemy.hp - dmg)
      logs = addLog(logs, { playerName: player.username, action: `${attacker.name} inflige ${dmg} dégâts à ${enemy.username}` })
    } else {
      const targetCard = enemy.field[target]
      if (!targetCard) return

      const newTargetDef = (targetCard.defense ?? 0) - dmg
      const newAttackerDef = (attacker.defense ?? 0) - (targetCard.attack ?? 0)

      const ef = [...enemy.field]
      ef[target] = newTargetDef <= 0 ? null : { ...targetCard, defense: newTargetDef }
      newEnemy.field = ef

      const pf = [...player.field]
      pf[playerFieldIndex] = newAttackerDef <= 0
        ? null
        : { ...attacker, hasAttacked: true, defense: newAttackerDef }
      newPlayer.field = pf

      logs = addLog(logs, {
        playerName: player.username,
        action: newTargetDef <= 0
          ? `${attacker.name} détruit ${targetCard.name}`
          : `${attacker.name} attaque ${targetCard.name}`,
      })
    }

    // Mark attacker as having attacked (if still on field)
    if (target !== 'hero' && newPlayer.field[playerFieldIndex]) {
      newPlayer.field[playerFieldIndex] = { ...newPlayer.field[playerFieldIndex]!, hasAttacked: true }
    } else if (target === 'hero') {
      const pf = [...player.field]
      pf[playerFieldIndex] = { ...attacker, hasAttacked: true }
      newPlayer.field = pf
    }

    const winner = newEnemy.hp <= 0 ? player.username : null

    set({
      player: newPlayer,
      enemy: newEnemy,
      battleLog: logs,
      winner,
      status: winner ? 'finished' : 'in_progress',
      selectedFieldIndex: null,
    })
  },

  endTurn: () => {
    const state = get()
    if (!state.isPlayerTurn) return

    const newMaxMana = Math.min(state.turn + 1, 10)

    // Reset summoning sickness + draw a card for player
    let newHand = [...state.player.hand]
    let playerDeckRemaining = [...state.playerDeckRemaining]
    if (playerDeckRemaining.length > 0) {
      const drawn = { ...playerDeckRemaining[0], instanceId: makeId() }
      newHand = [...newHand, drawn]
      playerDeckRemaining = playerDeckRemaining.slice(1)
    }

    const newField = state.player.field.map((c) =>
      c ? { ...c, hasAttacked: false, isSummoningSick: false } : null
    )

    const logs = addLog(state.battleLog, { playerName: state.player.username, action: 'Fin du tour' })

    set({
      isPlayerTurn: false,
      turn: state.turn + 1,
      playerDeckRemaining,
      player: {
        ...state.player,
        field: newField,
        mana: newMaxMana,
        maxMana: newMaxMana,
        hand: newHand,
        deckSize: playerDeckRemaining.length,
      },
      battleLog: logs,
      selectedHandIndex: null,
      selectedFieldIndex: null,
    })

    setTimeout(() => {
      const current = get()
      const result = simulateEnemyTurn({
        enemy: current.enemy,
        player: current.player,
        battleLog: current.battleLog,
        turn: current.turn,
        enemyDeckRemaining: current.enemyDeckRemaining,
      })
      set(result as Partial<GameState>)
    }, 1200)
  },

  clearSelection: () => set({ selectedHandIndex: null, selectedFieldIndex: null }),

  startPvpGame: (data, myPlayerId, myUsername, cardLookup) => {
    const playerHand = data.player.hand.map(toGameCard)
    const playerDeck = data.player.deckRemaining.map(toGameCard)
    set({
      mode: 'pvp',
      pvpMyPlayerId: myPlayerId,
      cardLookup,
      gameId: data.gameId,
      botId: data.opponentId,
      status: 'in_progress',
      turn: 1,
      isPlayerTurn: data.isFirstPlayer,
      winner: null,
      selectedHandIndex: null,
      selectedFieldIndex: null,
      playerDeckRemaining: playerDeck,
      enemyDeckRemaining: [],
      battleLog: [{ id: makeId(), playerName: 'Système', action: `Partie contre ${data.opponentUsername} — que les dieux te favorisent !`, isEnemy: false }],
      player: {
        id: myPlayerId,
        username: myUsername,
        hp: 20,
        mana: data.isFirstPlayer ? 1 : 0,
        maxMana: data.isFirstPlayer ? 1 : 0,
        deckSize: playerDeck.length,
        field: [null, null, null, null, null, null],
        hand: playerHand,
      },
      enemy: {
        id: data.opponentId,
        username: data.opponentUsername,
        hp: 20,
        mana: 0,
        maxMana: 0,
        deckSize: 0,
        field: [null, null, null, null, null, null],
        hand: [],
      },
    })
  },

  applyServerState: (serverState: any) => {
    const { pvpMyPlayerId, cardLookup, player: curPlayer, enemy: curEnemy } = get()
    if (!pvpMyPlayerId) return
    if (serverState.status === 'waiting_players') return

    const isP1 = serverState.player1.playerId === pvpMyPlayerId
    const myServer = isP1 ? serverState.player1 : serverState.player2
    const oppServer = isP1 ? serverState.player2 : serverState.player1

    const boardToField = (board: any[]): (GameCard | null)[] => {
      const field: (GameCard | null)[] = [null, null, null, null, null, null]
      board.slice(0, 6).forEach((c: any, i: number) => {
        const base = cardLookup[c.cardId]
        field[i] = {
          id: c.cardId,
          instanceId: c.instanceId,
          name: c.name,
          cardType: 'creature',
          manaCost: base?.manaCost ?? 0,
          attack: c.attack,
          defense: c.defense,
          effectText: base?.effectText,
          rarity: base?.rarity ?? 'common',
          imageUrl: base?.imageUrl,
          hasAttacked: !c.canAttack,
          isSummoningSick: !c.canAttack,
        }
      })
      return field
    }

    const myHand: GameCard[] = myServer.hand.map((cardId: string, i: number) => {
      const base = cardLookup[cardId]
      return base
        ? { ...base, instanceId: `${cardId}-${i}` }
        : { id: cardId, instanceId: `${cardId}-${i}`, name: '?', cardType: 'creature', manaCost: 0 }
    })

    const isPlayerTurn = serverState.currentTurnPlayerId === pvpMyPlayerId

    const winner = serverState.status === 'finished' && serverState.winnerId
      ? (serverState.winnerId === pvpMyPlayerId ? curPlayer.username : curEnemy.username)
      : null

    set({
      turn: serverState.turnNumber,
      isPlayerTurn,
      status: serverState.status === 'finished' ? 'finished' : 'in_progress',
      winner,
      selectedHandIndex: null,
      selectedFieldIndex: null,
      player: {
        ...curPlayer,
        hp: myServer.hp,
        mana: myServer.mana,
        maxMana: myServer.maxMana,
        hand: myHand,
        field: boardToField(myServer.board),
        deckSize: myServer.deckRemaining.length,
      },
      enemy: {
        ...curEnemy,
        hp: oppServer.hp,
        mana: oppServer.mana,
        maxMana: oppServer.maxMana,
        field: boardToField(oppServer.board),
        deckSize: oppServer.deckRemaining.length,
        hand: [],
      },
    })
  },

  applyGameOver: (winnerId: string) => {
    const { pvpMyPlayerId, player, enemy } = get()
    set({
      status: 'finished',
      winner: winnerId === pvpMyPlayerId ? player.username : enemy.username,
      isPlayerTurn: false,
      selectedHandIndex: null,
      selectedFieldIndex: null,
    })
  },

  reset: () => set({
    gameId: null,
    botId: null,
    status: 'idle',
    turn: 1,
    isPlayerTurn: true,
    player: EMPTY_PLAYER,
    enemy: EMPTY_PLAYER,
    playerDeckRemaining: [],
    enemyDeckRemaining: [],
    battleLog: [],
    winner: null,
    selectedHandIndex: null,
    selectedFieldIndex: null,
    mode: 'solo',
    pvpMyPlayerId: null,
    cardLookup: {},
  }),
}))
