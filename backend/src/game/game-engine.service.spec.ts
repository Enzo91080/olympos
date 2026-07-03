import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { CardOnBoard, GameState, PlayerState } from './game-state.interface';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'card-1',
    name: 'Test Creature',
    cardType: 'creature',
    manaCost: 2,
    attack: 3,
    defense: 2,
    spellTarget: null,
    rarity: 'common',
    effectText: null,
    imageUrl: null,
    ...overrides,
  };
}

function makeOnBoard(overrides: Partial<CardOnBoard> = {}): CardOnBoard {
  return {
    instanceId: 'inst-1',
    cardId: 'card-1',
    name: 'Test Creature',
    attack: 3,
    defense: 2,
    canAttack: true,
    ...overrides,
  };
}

function makePlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: id,
    hp: 20,
    mana: 5,
    maxMana: 5,
    hand: ['card-1'],
    deckRemaining: ['card-2', 'card-3'],
    board: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'game-1',
    status: 'in_progress',
    currentTurnPlayerId: 'p1',
    turnNumber: 1,
    connectedPlayers: ['p1', 'p2'],
    player1: makePlayer('p1'),
    player2: makePlayer('p2', { mana: 0, maxMana: 0, hand: [], deckRemaining: [] }),
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let prismaMock: { card: { findUnique: jest.Mock } };
let engine: GameEngineService;

beforeEach(() => {
  prismaMock = { card: { findUnique: jest.fn() } };
  engine = new GameEngineService(prismaMock as any);
});

// ─── startTurn ────────────────────────────────────────────────────────────────

describe('startTurn', () => {
  it("incremente maxMana de 1", () => {
    const state = makeState();
    state.player1.maxMana = 3;
    state.player1.mana = 3;
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.maxMana).toBe(4);
  });

  it("recharge mana au maximum (mana = maxMana)", () => {
    const state = makeState();
    state.player1.mana = 0;
    state.player1.maxMana = 4;
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.mana).toBe(result.player1.maxMana);
  });

  it("plafonne maxMana a 10", () => {
    const state = makeState();
    state.player1.maxMana = 10;
    state.player1.mana = 10;
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.maxMana).toBe(10);
    expect(result.player1.mana).toBe(10);
  });

  it("pioche 1 carte si deck non vide", () => {
    const state = makeState();
    state.player1.hand = [];
    state.player1.deckRemaining = ['card-a', 'card-b'];
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.hand).toContain('card-a');
    expect(result.player1.deckRemaining).not.toContain('card-a');
    expect(result.player1.hand).toHaveLength(1);
  });

  it("overdraw (I4) : si main pleine (10 cartes), carte detruite, main reste a 10", () => {
    const state = makeState();
    state.player1.hand = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'];
    state.player1.deckRemaining = ['new-card'];
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.hand).toHaveLength(10);
    expect(result.player1.hand).not.toContain('new-card');
    expect(result.player1.deckRemaining).toHaveLength(0);
  });

  it("deck vide : pas de pioche, pas d'erreur", () => {
    const state = makeState();
    state.player1.hand = ['card-1'];
    state.player1.deckRemaining = [];
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.hand).toHaveLength(1);
    expect(result.player1.deckRemaining).toHaveLength(0);
  });

  it("toutes les creatures alliees obtiennent canAttack = true", () => {
    const state = makeState();
    state.player1.board = [
      makeOnBoard({ instanceId: 'a', canAttack: false }),
      makeOnBoard({ instanceId: 'b', canAttack: false }),
    ];
    const result = engine.startTurn(state, 'p1');
    expect(result.player1.board.every(c => c.canAttack)).toBe(true);
  });

  it("incremente turnNumber", () => {
    const state = makeState();
    state.turnNumber = 5;
    const result = engine.startTurn(state, 'p1');
    expect(result.turnNumber).toBe(6);
  });

  it("status devient in_progress", () => {
    const state = makeState({ status: 'waiting_players' });
    const result = engine.startTurn(state, 'p1');
    expect(result.status).toBe('in_progress');
  });

  it("ne modifie pas les creatures adverses", () => {
    const state = makeState();
    state.player2.board = [makeOnBoard({ instanceId: 'enemy-1', canAttack: false })];
    const result = engine.startTurn(state, 'p1');
    expect(result.player2.board[0].canAttack).toBe(false);
  });
});

// ─── playCreature ─────────────────────────────────────────────────────────────

describe('playCreature', () => {
  it("pose la creature sur le board avec canAttack = false (summoning sickness)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    const result = await engine.playCreature(state, 'p1', 'card-1');
    expect(result.player1.board).toHaveLength(1);
    expect(result.player1.board[0].canAttack).toBe(false);
    expect(result.player1.board[0].attack).toBe(3);
    expect(result.player1.board[0].defense).toBe(2);
  });

  it("retire la carte de la main", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    const result = await engine.playCreature(state, 'p1', 'card-1');
    expect(result.player1.hand).not.toContain('card-1');
  });

  it("deduit le cout en mana", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard({ manaCost: 2 }));
    const state = makeState();
    state.player1.mana = 5;
    const result = await engine.playCreature(state, 'p1', 'card-1');
    expect(result.player1.mana).toBe(3);
  });

  it("chaque creature a un instanceId unique", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    state.player1.hand = ['card-1', 'card-1'];

    const s1 = await engine.playCreature(state, 'p1', 'card-1');
    const s2 = await engine.playCreature({ ...state, player1: s1.player1 }, 'p1', 'card-1');

    const ids = s2.player1.board.map(c => c.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("erreur si carte absente de la main", async () => {
    const state = makeState();
    state.player1.hand = [];
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(new BadRequestException('Card not in hand'));
  });

  it("erreur si carte introuvable en base (Prisma retourne null)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(null);
    const state = makeState();
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(new BadRequestException('Card not found'));
  });

  it("erreur si la carte n'est pas une creature", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard({ cardType: 'spell' }));
    const state = makeState();
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(new BadRequestException('Card is not a creature'));
  });

  it("erreur si mana insuffisant", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard({ manaCost: 6 }));
    const state = makeState();
    state.player1.mana = 3;
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(BadRequestException);
  });

  it("erreur si le board est plein (7 creatures max, I3)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    state.player1.board = Array(7).fill(null).map((_, i) => makeOnBoard({ instanceId: `c${i}` }));
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(new BadRequestException('Board is full (max 7 creatures)'));
  });

  it("erreur si status != in_progress (I7)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState({ status: 'waiting_players' });
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(BadRequestException);
  });

  it("erreur si ce n'est pas le tour du joueur (I8)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState({ currentTurnPlayerId: 'p2' });
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow(ForbiddenException);
  });
});

// ─── playSpellAuto ────────────────────────────────────────────────────────────

describe('playSpellAuto', () => {
  const spellCard = (spellTarget: string | null, atk = 3, def: number | null = null) =>
    makeCard({ cardType: 'spell', spellTarget, attack: atk, defense: def, manaCost: 2 });

  it("aoe_enemy : reduit la DEF de toutes les creatures ennemies", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('aoe_enemy', 2));
    const state = makeState();
    state.player2.board = [
      makeOnBoard({ instanceId: 'e1', defense: 4 }),
      makeOnBoard({ instanceId: 'e2', defense: 2 }),
    ];
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player2.board).toHaveLength(1);
    expect(result.player2.board[0].instanceId).toBe('e1');
    expect(result.player2.board[0].defense).toBe(2);
  });

  it("aoe_enemy : supprime les creatures a DEF <= 0", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('aoe_enemy', 5));
    const state = makeState();
    state.player2.board = [
      makeOnBoard({ instanceId: 'e1', defense: 3 }),
      makeOnBoard({ instanceId: 'e2', defense: 2 }),
    ];
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player2.board).toHaveLength(0);
  });

  it("self : soigne le joueur (soin cape a 20 PV, I2)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('self', 5));
    const state = makeState();
    state.player1.hp = 18;
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player1.hp).toBe(20);
  });

  it("self : soin excessif ne depasse pas 20 PV (I2)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('self', 10));
    const state = makeState();
    state.player1.hp = 15;
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player1.hp).toBe(20);
  });

  it("self : buffe la DEF des creatures alliees si defense > 0", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('self', 0, 2));
    const state = makeState();
    state.player1.board = [
      makeOnBoard({ instanceId: 'a', defense: 3 }),
      makeOnBoard({ instanceId: 'b', defense: 1 }),
    ];
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player1.board[0].defense).toBe(5);
    expect(result.player1.board[1].defense).toBe(3);
  });

  it("summon : invoque une creature avec canAttack = false", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('summon', 1, 2));
    const state = makeState();
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player1.board).toHaveLength(1);
    expect(result.player1.board[0].canAttack).toBe(false);
    expect(result.player1.board[0].attack).toBe(1);
    expect(result.player1.board[0].defense).toBe(2);
  });

  it("summon : ne cree pas si board plein (7 creatures, I3)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('summon', 1, 2));
    const state = makeState();
    state.player1.board = Array(7).fill(null).map((_, i) => makeOnBoard({ instanceId: `c${i}` }));
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player1.board).toHaveLength(7);
  });

  it("fallback (spellTarget null) : degats directs au heros adverse", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard(null, 4));
    const state = makeState();
    state.player2.hp = 20;
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player2.hp).toBe(16);
  });

  it("HP heros clampe a 0 — jamais negatif (I2)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard(null, 99));
    const state = makeState();
    state.player2.hp = 5;
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player2.hp).toBe(0);
  });

  it("erreur pour spellTarget = targeted", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('targeted'));
    await expect(engine.playSpellAuto(makeState(), 'p1', 'card-1'))
      .rejects.toThrow('This spell requires a target — use play_spell_targeted');
  });

  it("erreur pour spellTarget = targeted_creature", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('targeted_creature'));
    await expect(engine.playSpellAuto(makeState(), 'p1', 'card-1'))
      .rejects.toThrow('This spell requires a target — use play_spell_targeted');
  });

  it("erreur pour spellTarget = equip (non supporte en PvP)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('equip'));
    await expect(engine.playSpellAuto(makeState(), 'p1', 'card-1'))
      .rejects.toThrow('Equip spells are not supported in PvP');
  });

  it("erreur pour spellTarget = passive", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard('passive'));
    await expect(engine.playSpellAuto(makeState(), 'p1', 'card-1'))
      .rejects.toThrow('Passive spells have no active effect');
  });

  it("erreur si mana insuffisant", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard(null, 3));
    const state = makeState();
    state.player1.mana = 1;
    await expect(engine.playSpellAuto(state, 'p1', 'card-1'))
      .rejects.toThrow(BadRequestException);
  });

  it("retire la carte de la main et deduit le mana", async () => {
    prismaMock.card.findUnique.mockResolvedValue(spellCard(null, 3, null));
    const state = makeState();
    state.player1.mana = 5;
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player1.hand).not.toContain('card-1');
    expect(result.player1.mana).toBe(3);
  });
});

// ─── playSpellTargeted ────────────────────────────────────────────────────────

describe('playSpellTargeted', () => {
  const targetedCard = (spellTarget: 'targeted' | 'targeted_creature', power = 4) =>
    makeCard({ cardType: 'spell', spellTarget, attack: power, manaCost: 2 });

  it("targeted -> creature : reduit la DEF, retire si <= 0", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted', 5));
    const state = makeState();
    state.player2.board = [makeOnBoard({ instanceId: 'e1', defense: 3 })];
    const result = await engine.playSpellTargeted(state, 'p1', 'card-1', 'e1', 'creature');
    expect(result.player2.board).toHaveLength(0);
  });

  it("targeted -> creature : survit si DEF > power", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted', 2));
    const state = makeState();
    state.player2.board = [makeOnBoard({ instanceId: 'e1', defense: 5 })];
    const result = await engine.playSpellTargeted(state, 'p1', 'card-1', 'e1', 'creature');
    expect(result.player2.board).toHaveLength(1);
    expect(result.player2.board[0].defense).toBe(3);
  });

  it("targeted -> heros : reduit les HP de l'adversaire", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted', 7));
    const state = makeState();
    state.player2.hp = 20;
    const result = await engine.playSpellTargeted(state, 'p1', 'card-1', 'hero', 'hero');
    expect(result.player2.hp).toBe(13);
  });

  it("targeted -> heros : HP clampe a 0 (I2)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted', 99));
    const state = makeState();
    state.player2.hp = 5;
    const result = await engine.playSpellTargeted(state, 'p1', 'card-1', 'hero', 'hero');
    expect(result.player2.hp).toBe(0);
  });

  it("targeted_creature -> creature : OK", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted_creature', 3));
    const state = makeState();
    state.player2.board = [makeOnBoard({ instanceId: 'e1', defense: 5 })];
    const result = await engine.playSpellTargeted(state, 'p1', 'card-1', 'e1', 'creature');
    expect(result.player2.board[0].defense).toBe(2);
  });

  it("targeted_creature -> heros : erreur", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted_creature'));
    const state = makeState();
    await expect(engine.playSpellTargeted(state, 'p1', 'card-1', 'hero', 'hero'))
      .rejects.toThrow('This spell can only target a creature');
  });

  it("erreur si spellTarget n'est pas targeted/targeted_creature", async () => {
    prismaMock.card.findUnique.mockResolvedValue(
      makeCard({ cardType: 'spell', spellTarget: 'aoe_enemy', manaCost: 2 })
    );
    const state = makeState();
    await expect(engine.playSpellTargeted(state, 'p1', 'card-1', 'e1', 'creature'))
      .rejects.toThrow('This spell is not targeted — use play_spell_auto');
  });

  it("erreur si la creature cible n'est pas sur le board", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted'));
    const state = makeState();
    state.player2.board = [makeOnBoard({ instanceId: 'e1' })];
    await expect(engine.playSpellTargeted(state, 'p1', 'card-1', 'inexistant', 'creature'))
      .rejects.toThrow('Target creature not on board');
  });

  it("erreur si targetId invalide pour type hero", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted'));
    const state = makeState();
    await expect(engine.playSpellTargeted(state, 'p1', 'card-1', 'not-hero', 'hero'))
      .rejects.toThrow('Target must be a creature instanceId or "hero"');
  });

  it("retire la carte et deduit le mana", async () => {
    prismaMock.card.findUnique.mockResolvedValue(targetedCard('targeted', 3));
    const state = makeState();
    state.player1.mana = 5;
    state.player2.hp = 20;
    const result = await engine.playSpellTargeted(state, 'p1', 'card-1', 'hero', 'hero');
    expect(result.player1.hand).not.toContain('card-1');
    expect(result.player1.mana).toBe(3);
  });
});

// ─── attackCreature ───────────────────────────────────────────────────────────

describe('attackCreature', () => {
  it("degats symetriques — les deux survivent avec DEF reduite", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 2, defense: 5, canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1', attack: 3, defense: 4, canAttack: true })];
    const result = engine.attackCreature(state, 'p1', 'a1', 'e1');
    expect(result.player1.board).toHaveLength(1);
    expect(result.player1.board[0].defense).toBe(2); // 5-3
    expect(result.player2.board).toHaveLength(1);
    expect(result.player2.board[0].defense).toBe(2); // 4-2
  });

  it("attaquant et defenseur meurent tous les deux (DEF = 0)", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 4, defense: 3, canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1', attack: 3, defense: 4, canAttack: true })];
    const result = engine.attackCreature(state, 'p1', 'a1', 'e1');
    expect(result.player1.board).toHaveLength(0);
    expect(result.player2.board).toHaveLength(0);
  });

  it("seule la cible meurt — attaquant survit", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 5, defense: 5, canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1', attack: 1, defense: 3, canAttack: true })];
    const result = engine.attackCreature(state, 'p1', 'a1', 'e1');
    expect(result.player1.board).toHaveLength(1);
    expect(result.player1.board[0].defense).toBe(4); // 5-1
    expect(result.player2.board).toHaveLength(0);
  });

  it("seul l'attaquant meurt — defenseur survit", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 1, defense: 2, canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1', attack: 3, defense: 5, canAttack: true })];
    const result = engine.attackCreature(state, 'p1', 'a1', 'e1');
    expect(result.player1.board).toHaveLength(0);
    expect(result.player2.board).toHaveLength(1);
    expect(result.player2.board[0].defense).toBe(4); // 5-1
  });

  it("attaquant passe a canAttack = false apres l'attaque", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 1, defense: 10, canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1', attack: 1, defense: 10, canAttack: true })];
    const result = engine.attackCreature(state, 'p1', 'a1', 'e1');
    expect(result.player1.board[0].canAttack).toBe(false);
  });

  it("erreur si l'attaquant n'est pas sur le board", () => {
    const state = makeState();
    state.player2.board = [makeOnBoard({ instanceId: 'e1' })];
    expect(() => engine.attackCreature(state, 'p1', 'inexistant', 'e1'))
      .toThrow('Attacker not on board');
  });

  it("erreur si la creature ne peut pas attaquer ce tour (canAttack = false)", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', canAttack: false })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1' })];
    expect(() => engine.attackCreature(state, 'p1', 'a1', 'e1'))
      .toThrow('Creature cannot attack this turn');
  });

  it("erreur si la cible n'est pas sur le board", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', canAttack: true })];
    expect(() => engine.attackCreature(state, 'p1', 'a1', 'inexistant'))
      .toThrow('Target not on board');
  });

  it("erreur si status != in_progress (I7)", () => {
    const state = makeState({ status: 'waiting_players' });
    state.player1.board = [makeOnBoard({ instanceId: 'a1' })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1' })];
    expect(() => engine.attackCreature(state, 'p1', 'a1', 'e1'))
      .toThrow(BadRequestException);
  });

  it("erreur si ce n'est pas le tour du joueur (I8)", () => {
    const state = makeState({ currentTurnPlayerId: 'p2' });
    state.player1.board = [makeOnBoard({ instanceId: 'a1' })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1' })];
    expect(() => engine.attackCreature(state, 'p1', 'a1', 'e1'))
      .toThrow(ForbiddenException);
  });
});

// ─── attackPlayer ─────────────────────────────────────────────────────────────

describe('attackPlayer', () => {
  it("reduit les HP du joueur adverse de l'ATK de la creature", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 5, canAttack: true })];
    state.player2.board = [];
    const result = engine.attackPlayer(state, 'p1', 'a1');
    expect(result.player2.hp).toBe(15);
  });

  it("HP clampe a 0 — jamais negatif (I2)", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 99, canAttack: true })];
    state.player2.board = [];
    state.player2.hp = 5;
    const result = engine.attackPlayer(state, 'p1', 'a1');
    expect(result.player2.hp).toBe(0);
  });

  it("attaquant passe a canAttack = false apres l'attaque", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', attack: 3, canAttack: true })];
    state.player2.board = [];
    const result = engine.attackPlayer(state, 'p1', 'a1');
    expect(result.player1.board[0].canAttack).toBe(false);
  });

  it("taunt (I9) : erreur si l'adversaire a des creatures sur le terrain", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e1' })];
    expect(() => engine.attackPlayer(state, 'p1', 'a1'))
      .toThrow('Cannot attack the hero while enemy creatures are on the board');
  });

  it("erreur si l'attaquant n'est pas sur le board", () => {
    const state = makeState();
    state.player2.board = [];
    expect(() => engine.attackPlayer(state, 'p1', 'inexistant'))
      .toThrow('Attacker not on board');
  });

  it("erreur si la creature ne peut pas attaquer (summoning sickness)", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a1', canAttack: false })];
    state.player2.board = [];
    expect(() => engine.attackPlayer(state, 'p1', 'a1'))
      .toThrow('Creature cannot attack this turn');
  });

  it("erreur si status = finished (I7)", () => {
    const state = makeState({ status: 'finished' });
    state.player1.board = [makeOnBoard({ instanceId: 'a1', canAttack: true })];
    state.player2.board = [];
    expect(() => engine.attackPlayer(state, 'p1', 'a1'))
      .toThrow(BadRequestException);
  });

  it("erreur si ce n'est pas le tour du joueur (I8)", () => {
    const state = makeState({ currentTurnPlayerId: 'p2' });
    state.player1.board = [makeOnBoard({ instanceId: 'a1', canAttack: true })];
    state.player2.board = [];
    expect(() => engine.attackPlayer(state, 'p1', 'a1'))
      .toThrow(ForbiddenException);
  });
});

// ─── checkVictory ─────────────────────────────────────────────────────────────

describe('checkVictory', () => {
  it("retourne isOver=false si les deux joueurs sont en vie", () => {
    const state = makeState();
    state.player1.hp = 10;
    state.player2.hp = 15;
    const result = engine.checkVictory(state);
    expect(result.isOver).toBe(false);
    expect(result.winnerId).toBeUndefined();
  });

  it("P1 gagne si P2.hp = 0", () => {
    const state = makeState();
    state.player2.hp = 0;
    const result = engine.checkVictory(state);
    expect(result.isOver).toBe(true);
    expect(result.winnerId).toBe('p1');
  });

  it("P2 gagne si P1.hp = 0", () => {
    const state = makeState();
    state.player1.hp = 0;
    const result = engine.checkVictory(state);
    expect(result.isOver).toBe(true);
    expect(result.winnerId).toBe('p2');
  });

  it("P2 gagne si P1.hp < 0 (debordement clampe)", () => {
    const state = makeState();
    state.player1.hp = -5;
    const result = engine.checkVictory(state);
    expect(result.isOver).toBe(true);
    expect(result.winnerId).toBe('p2');
  });
});

// ─── Invariants de jeu (scenarios combines) ───────────────────────────────────

describe('Invariants (I1-I13)', () => {
  it("I4 — la main ne depasse jamais 10 cartes (overdraw repete)", () => {
    const state = makeState();
    state.player1.hand = Array(10).fill('card-x').map((c, i) => `${c}-${i}`);
    state.player1.deckRemaining = ['card-a', 'card-b', 'card-c'];

    const s = engine.startTurn(state, 'p1');
    expect(s.player1.hand).toHaveLength(10);
    expect(s.player1.deckRemaining).toHaveLength(2);
  });

  it("I3 — board ne depasse pas 7 creatures via playCreature", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    state.player1.board = Array(7).fill(null).map((_, i) => makeOnBoard({ instanceId: `c${i}` }));
    await expect(engine.playCreature(state, 'p1', 'card-1'))
      .rejects.toThrow('Board is full (max 7 creatures)');
  });

  it("I2 — HP adversaire jamais < 0 apres sort massif", async () => {
    prismaMock.card.findUnique.mockResolvedValue(
      makeCard({ cardType: 'spell', spellTarget: null, attack: 9999, manaCost: 1 })
    );
    const state = makeState();
    state.player2.hp = 1;
    const result = await engine.playSpellAuto(state, 'p1', 'card-1');
    expect(result.player2.hp).toBeGreaterThanOrEqual(0);
  });

  it("I7 — aucune action possible si status = finished", () => {
    const state = makeState({ status: 'finished' });
    state.player1.board = [makeOnBoard({ instanceId: 'a', canAttack: true })];
    state.player2.board = [];
    expect(() => engine.attackPlayer(state, 'p1', 'a'))
      .toThrow(BadRequestException);
  });

  it("I9 (taunt) — attaque directe bloquee si terrain adverse non vide", () => {
    const state = makeState();
    state.player1.board = [makeOnBoard({ instanceId: 'a', canAttack: true })];
    state.player2.board = [makeOnBoard({ instanceId: 'e', defense: 1 })];
    expect(() => engine.attackPlayer(state, 'p1', 'a'))
      .toThrow('Cannot attack the hero while enemy creatures are on the board');
  });

  it("I11 — summoning sickness : creature posee ce tour canAttack = false", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    const afterPlay = await engine.playCreature(state, 'p1', 'card-1');
    expect(afterPlay.player1.board[0].canAttack).toBe(false);
  });

  it("I11 — summoning sickness levee au tour suivant (via startTurn)", async () => {
    prismaMock.card.findUnique.mockResolvedValue(makeCard());
    const state = makeState();
    const afterPlay = await engine.playCreature(state, 'p1', 'card-1');
    const afterP2Turn = engine.startTurn({ ...afterPlay, currentTurnPlayerId: 'p2' }, 'p2');
    const afterP1Turn = engine.startTurn({ ...afterP2Turn, currentTurnPlayerId: 'p1' }, 'p1');
    expect(afterP1Turn.player1.board[0].canAttack).toBe(true);
  });
});
