import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GameState, PlayerState, CardOnBoard } from './game-state.interface';
import { PrismaService } from '../prisma/prisma.service';

const STARTING_HP = 20;
const STARTING_HAND_SIZE = 4;
const MAX_MANA = 10;
export const MAX_BOARD_SIZE = 7;
const MAX_HAND_SIZE = 10;

@Injectable()
export class GameEngineService {
  constructor(private prisma: PrismaService) {}

  // ─── Initialisation ────────────────────────────────────────────────────────

  async initGameState(
    gameId: string,
    player1Id: string,
    deck1CardIds: string[],
    player2Id: string,
    deck2CardIds: string[],
  ): Promise<GameState> {
    const deck1 = this.shuffle([...deck1CardIds]);
    const deck2 = this.shuffle([...deck2CardIds]);

    const p1Hand = deck1.splice(0, STARTING_HAND_SIZE);
    const p2Hand = deck2.splice(0, STARTING_HAND_SIZE);

    return {
      gameId,
      player1: {
        playerId: player1Id,
        hp: STARTING_HP,
        mana: 0,
        maxMana: 0,
        hand: p1Hand,
        deckRemaining: deck1,
        board: [],
      },
      player2: {
        playerId: player2Id,
        hp: STARTING_HP,
        mana: 0,
        maxMana: 0,
        hand: p2Hand,
        deckRemaining: deck2,
        board: [],
      },
      currentTurnPlayerId: player1Id,
      turnNumber: 1,
      connectedPlayers: [],
      status: 'waiting_players',
    };
  }

  // ─── Début de tour ──────────────────────────────────────────────────────────

  startTurn(state: GameState, playerId: string): GameState {
    const player = this.getPlayer(state, playerId);
    const newMaxMana = Math.min(player.maxMana + 1, MAX_MANA);

    // Pioche — overdraw si main pleine (I4)
    let newHand = [...player.hand];
    let newDeck = [...player.deckRemaining];
    if (newDeck.length > 0) {
      if (newHand.length < MAX_HAND_SIZE) {
        newHand = [...newHand, newDeck[0]];
      }
      // Si main pleine : la carte est détruite (overdraw), aucun effet
      newDeck = newDeck.slice(1);
    }

    // Toutes les créatures existantes sur le board peuvent attaquer (I11)
    const newBoard = player.board.map((c) => ({ ...c, canAttack: true }));

    const updatedPlayer: PlayerState = {
      ...player,
      mana: newMaxMana,
      maxMana: newMaxMana,
      hand: newHand,
      deckRemaining: newDeck,
      board: newBoard,
    };

    return {
      ...state,
      ...this.setPlayer(state, playerId, updatedPlayer),
      currentTurnPlayerId: playerId,
      turnNumber: state.turnNumber + 1,
      status: 'in_progress',
    };
  }

  // ─── Jouer une créature ────────────────────────────────────────────────────

  async playCreature(
    state: GameState,
    playerId: string,
    cardId: string,
  ): Promise<GameState> {
    this.assertInProgress(state);
    this.assertTurn(state, playerId);

    const player = this.getPlayer(state, playerId);

    if (!player.hand.includes(cardId)) throw new BadRequestException('Card not in hand');

    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new BadRequestException('Card not found');
    if (card.cardType !== 'creature') throw new BadRequestException('Card is not a creature');
    if (player.mana < card.manaCost) throw new BadRequestException(`Not enough mana (need ${card.manaCost}, have ${player.mana})`);
    if (player.board.length >= MAX_BOARD_SIZE) throw new BadRequestException('Board is full (max 7 creatures)');

    const _idx = player.hand.indexOf(cardId);
    const newHand = [...player.hand.slice(0, _idx), ...player.hand.slice(_idx + 1)];
    const creature: CardOnBoard = {
      instanceId: uuid(),
      cardId: card.id,
      name: card.name,
      attack: card.attack ?? 0,
      defense: card.defense ?? 1,
      canAttack: false, // summoning sickness (I11)
    };

    const updatedPlayer: PlayerState = {
      ...player,
      hand: newHand,
      mana: player.mana - card.manaCost,
      board: [...player.board, creature],
    };

    return this.setPlayerInState(state, playerId, updatedPlayer);
  }

  // ─── Jouer un sort automatique ─────────────────────────────────────────────

  async playSpellAuto(
    state: GameState,
    playerId: string,
    cardId: string,
  ): Promise<GameState> {
    this.assertInProgress(state);
    this.assertTurn(state, playerId);

    const player = this.getPlayer(state, playerId);

    if (!player.hand.includes(cardId)) throw new BadRequestException('Card not in hand');

    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new BadRequestException('Card not found');
    if (card.cardType === 'creature') throw new BadRequestException('Use play_creature for creatures');

    const st = card.spellTarget ?? null;
    if (st === 'targeted' || st === 'targeted_creature') {
      throw new BadRequestException('This spell requires a target — use play_spell_targeted');
    }
    if (st === 'equip') {
      throw new BadRequestException('Equip spells are not supported in PvP');
    }
    if (st === 'passive') {
      throw new BadRequestException('Passive spells have no active effect');
    }

    if (player.mana < card.manaCost) throw new BadRequestException(`Not enough mana (need ${card.manaCost}, have ${player.mana})`);

    const power = card.attack ?? 0;
    const bonusDef = card.defense ?? 0;
    const _idx = player.hand.indexOf(cardId);
    const newHand = [...player.hand.slice(0, _idx), ...player.hand.slice(_idx + 1)];
    let updatedPlayer: PlayerState = { ...player, hand: newHand, mana: player.mana - card.manaCost };
    let updatedOpponent = this.getOpponent(state, playerId);

    if (st === 'aoe_enemy') {
      const newBoard = updatedOpponent.board
        .map((c) => ({ ...c, defense: c.defense - power }))
        .filter((c) => c.defense > 0);
      updatedOpponent = { ...updatedOpponent, board: newBoard };
    } else if (st === 'self') {
      if (power > 0) updatedPlayer = { ...updatedPlayer, hp: Math.min(STARTING_HP, updatedPlayer.hp + power) }; // I2
      if (bonusDef > 0) {
        updatedPlayer = {
          ...updatedPlayer,
          board: updatedPlayer.board.map((c) => ({ ...c, defense: c.defense + bonusDef })),
        };
      }
    } else if (st === 'summon') {
      if (updatedPlayer.board.length < MAX_BOARD_SIZE) { // I3
        const summoned: CardOnBoard = {
          instanceId: uuid(),
          cardId: card.id,
          name: 'Serviteur',
          attack: power || 1,
          defense: bonusDef || 2,
          canAttack: false,
        };
        updatedPlayer = { ...updatedPlayer, board: [...updatedPlayer.board, summoned] };
      }
    } else {
      // Fallback : dégâts directs au héros
      updatedOpponent = { ...updatedOpponent, hp: Math.max(0, updatedOpponent.hp - power) }; // I2
    }

    const newState = this.setPlayerInState(state, playerId, updatedPlayer);
    return this.setPlayerInState(newState, updatedOpponent.playerId, updatedOpponent);
  }

  // ─── Jouer un sort ciblé ───────────────────────────────────────────────────

  async playSpellTargeted(
    state: GameState,
    playerId: string,
    cardId: string,
    targetId: string,
    targetType: 'creature' | 'hero',
  ): Promise<GameState> {
    this.assertInProgress(state);
    this.assertTurn(state, playerId);

    const player = this.getPlayer(state, playerId);
    const opponent = this.getOpponent(state, playerId);

    if (!player.hand.includes(cardId)) throw new BadRequestException('Card not in hand');

    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new BadRequestException('Card not found');

    const st = card.spellTarget ?? null;
    if (st !== 'targeted' && st !== 'targeted_creature') {
      throw new BadRequestException('This spell is not targeted — use play_spell_auto');
    }
    if (st === 'targeted_creature' && targetType === 'hero') {
      throw new BadRequestException('This spell can only target a creature');
    }
    if (player.mana < card.manaCost) throw new BadRequestException(`Not enough mana (need ${card.manaCost}, have ${player.mana})`);

    // Validation de la cible
    if (targetType === 'creature') {
      const targetExists = opponent.board.some((c) => c.instanceId === targetId);
      if (!targetExists) throw new BadRequestException('Target creature not on board');
    } else {
      if (targetId !== 'hero') throw new BadRequestException('Target must be a creature instanceId or "hero"');
    }

    const power = card.attack ?? 0;
    const _idx = player.hand.indexOf(cardId);
    const newHand = [...player.hand.slice(0, _idx), ...player.hand.slice(_idx + 1)];
    let updatedPlayer: PlayerState = { ...player, hand: newHand, mana: player.mana - card.manaCost };
    let updatedOpponent = { ...opponent };

    if (targetType === 'creature') {
      const newBoard = updatedOpponent.board
        .map((c) => c.instanceId === targetId ? { ...c, defense: c.defense - power } : c)
        .filter((c) => c.defense > 0);
      updatedOpponent = { ...updatedOpponent, board: newBoard };
    } else {
      updatedOpponent = { ...updatedOpponent, hp: Math.max(0, updatedOpponent.hp - power) }; // I2
    }

    const newState = this.setPlayerInState(state, playerId, updatedPlayer);
    return this.setPlayerInState(newState, updatedOpponent.playerId, updatedOpponent);
  }

  // ─── Attaque créature → créature ───────────────────────────────────────────

  attackCreature(
    state: GameState,
    attackerPlayerId: string,
    attackerInstanceId: string,
    targetInstanceId: string,
  ): GameState {
    this.assertInProgress(state);
    this.assertTurn(state, attackerPlayerId);

    const attacker = this.getPlayer(state, attackerPlayerId);
    const defender = this.getOpponent(state, attackerPlayerId);

    const attackerCreature = attacker.board.find((c) => c.instanceId === attackerInstanceId);
    if (!attackerCreature) throw new BadRequestException('Attacker not on board');
    if (!attackerCreature.canAttack) throw new BadRequestException('Creature cannot attack this turn');

    const targetCreature = defender.board.find((c) => c.instanceId === targetInstanceId);
    if (!targetCreature) throw new BadRequestException('Target not on board');

    // Résolution symétrique du combat
    const newAttackerDefense = attackerCreature.defense - targetCreature.attack;
    const newTargetDefense = targetCreature.defense - attackerCreature.attack;

    const updatedAttackerBoard = attacker.board
      .map((c) => c.instanceId === attackerInstanceId ? { ...c, defense: newAttackerDefense, canAttack: false } : c)
      .filter((c) => c.defense > 0);

    const updatedDefenderBoard = defender.board
      .map((c) => c.instanceId === targetInstanceId ? { ...c, defense: newTargetDefense } : c)
      .filter((c) => c.defense > 0);

    const newState = this.setPlayerInState(state, attackerPlayerId, { ...attacker, board: updatedAttackerBoard });
    return this.setPlayerInState(newState, defender.playerId, { ...defender, board: updatedDefenderBoard });
  }

  // ─── Attaque créature → joueur ──────────────────────────────────────────────

  attackPlayer(
    state: GameState,
    attackerPlayerId: string,
    attackerInstanceId: string,
  ): GameState {
    this.assertInProgress(state);
    this.assertTurn(state, attackerPlayerId);

    const attacker = this.getPlayer(state, attackerPlayerId);
    const defender = this.getOpponent(state, attackerPlayerId);

    // Taunt implicite (I9) : impossible d'attaquer le héros si des créatures adverses sont en jeu
    if (defender.board.length > 0) {
      throw new BadRequestException('Cannot attack the hero while enemy creatures are on the board');
    }

    const attackerCreature = attacker.board.find((c) => c.instanceId === attackerInstanceId);
    if (!attackerCreature) throw new BadRequestException('Attacker not on board');
    if (!attackerCreature.canAttack) throw new BadRequestException('Creature cannot attack this turn');

    const updatedAttackerBoard = attacker.board.map((c) =>
      c.instanceId === attackerInstanceId ? { ...c, canAttack: false } : c,
    );

    const newDefenderHp = Math.max(0, defender.hp - attackerCreature.attack); // I2

    const newState = this.setPlayerInState(state, attackerPlayerId, { ...attacker, board: updatedAttackerBoard });
    return this.setPlayerInState(newState, defender.playerId, { ...defender, hp: newDefenderHp });
  }

  // ─── Condition de victoire ──────────────────────────────────────────────────

  checkVictory(state: GameState): { isOver: boolean; winnerId?: string } {
    const p1 = state.player1;
    const p2 = state.player2;
    if (p1.hp <= 0) return { isOver: true, winnerId: p2.playerId };
    if (p2.hp <= 0) return { isOver: true, winnerId: p1.playerId };
    return { isOver: false };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private assertInProgress(state: GameState) {
    if (state.status !== 'in_progress') {
      throw new BadRequestException(`Action not allowed in state: ${state.status}`);
    }
  }

  private assertTurn(state: GameState, playerId: string) {
    if (state.currentTurnPlayerId !== playerId) {
      throw new ForbiddenException('Not your turn');
    }
  }

  getPlayer(state: GameState, playerId: string): PlayerState {
    if (state.player1.playerId === playerId) return state.player1;
    if (state.player2.playerId === playerId) return state.player2;
    throw new ForbiddenException('Not a participant');
  }

  getOpponent(state: GameState, playerId: string): PlayerState {
    if (state.player1.playerId === playerId) return state.player2;
    if (state.player2.playerId === playerId) return state.player1;
    throw new ForbiddenException('Not a participant');
  }

  private setPlayer(state: GameState, playerId: string, updated: PlayerState): Partial<GameState> {
    if (state.player1.playerId === playerId) return { player1: updated };
    return { player2: updated };
  }

  private setPlayerInState(state: GameState, playerId: string, updated: PlayerState): GameState {
    if (state.player1.playerId === playerId) return { ...state, player1: updated };
    return { ...state, player2: updated };
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
