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
  hasAttacked?: boolean
  isSummoningSick?: boolean
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

  startGame: (data: SoloGameResponse, authPlayerId: string, authUsername: string) => void
  selectHandCard: (index: number) => void
  playCard: (handIndex: number, slotIndex: number) => void
  selectFieldCard: (index: number) => void
  attackEnemy: (playerFieldIndex: number, target: number | 'hero') => void
  endTurn: () => void
  reset: () => void
}

const makeId = () => Math.random().toString(36).slice(2, 9)

function toGameCard(card: BackendCard): GameCard {
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
  const newMaxMana = Math.min(state.turn + 1, 10)
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

  // Draw a card
  if (enemyDeckRemaining.length > 0) {
    const drawn = { ...enemyDeckRemaining[0], instanceId: makeId(), hasAttacked: false, isSummoningSick: true }
    enemy.hand = [...enemy.hand, drawn]
    enemyDeckRemaining = enemyDeckRemaining.slice(1)
    enemy.deckSize = enemyDeckRemaining.length + enemy.hand.length
  }

  // Reset board canAttack (new turn)
  enemy.field = enemy.field.map((c) => c ? { ...c, hasAttacked: false, isSummoningSick: false } : null)

  // Play a creature from hand if affordable and board not full
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
      logs = addLog(logs, { playerName: enemy.username, action: `Summoned ${creatureInHand.name}`, isEnemy: true })
    }
  }

  // Attack with non-sick field cards
  const attackers = enemy.field.filter((c): c is GameCard => c !== null && !c.isSummoningSick && !c.hasAttacked)
  for (const attacker of attackers) {
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
          ? `${attacker.name} destroyed ${playerCreature.name}`
          : `${attacker.name} attacked ${playerCreature.name}`,
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
      logs = addLog(logs, { playerName: enemy.username, action: `${attacker.name} attacked your hero for ${dmg}`, isEnemy: true })
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

  startGame: (data, authPlayerId, authUsername) => {
    const playerHand = data.player.hand.map(toGameCard)
    const playerDeck = data.player.deckRemaining.map(toGameCard)
    const botHand = data.bot.hand.map(toGameCard)
    const botDeck = data.bot.deckRemaining.map(toGameCard)

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
      battleLog: [{ id: makeId(), playerName: 'System', action: 'Battle begins! May the gods favor you.', isEnemy: false }],
      player: {
        id: authPlayerId,
        username: authUsername,
        hp: 20,
        mana: 1,
        maxMana: 1,
        deckSize: playerDeck.length,
        field: [null, null, null, null, null, null],
        hand: playerHand,
      },
      enemy: {
        id: data.botId,
        username: data.botUsername,
        hp: 20,
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
    const { player, battleLog, isPlayerTurn, playerDeckRemaining } = get()
    if (!isPlayerTurn) return
    const card = player.hand[handIndex]
    if (!card || player.field[slotIndex] !== null) return
    if (card.manaCost > player.mana) return

    const newHand = player.hand.filter((_, i) => i !== handIndex)
    const newField = [...player.field]

    // Only creatures go on the field; spells/artifacts have instant effects
    if (card.cardType === 'creature') {
      newField[slotIndex] = { ...card, hasAttacked: false, isSummoningSick: true }
    }

    const newMana = player.mana - card.manaCost
    const logs = addLog(battleLog, {
      playerName: player.username,
      action: card.cardType === 'creature' ? `Summoned ${card.name}` : `Cast ${card.name}`,
      detail: card.effectText ?? undefined,
    })

    set({
      player: { ...player, hand: newHand, field: newField, mana: newMana },
      battleLog: logs,
      selectedHandIndex: null,
      selectedFieldIndex: null,
    })
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
      logs = addLog(logs, { playerName: player.username, action: `${attacker.name} dealt ${dmg} damage to ${enemy.username}` })
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
          ? `${attacker.name} destroyed ${targetCard.name}`
          : `${attacker.name} attacked ${targetCard.name}`,
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

    const logs = addLog(state.battleLog, { playerName: state.player.username, action: 'Ended their turn' })

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
  }),
}))
