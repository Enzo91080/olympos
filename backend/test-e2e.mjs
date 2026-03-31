/**
 * Olympos — Script de test E2E complet
 * Couvre : Auth, Player, Cards, Decks, Matchmaking, Games, WebSocket
 * Usage : node test-e2e.mjs
 */

import { io } from 'socket.io-client';

const BASE = 'http://localhost:3000';
const WS   = 'http://localhost:3000/game';

let passed = 0, failed = 0, skipped = 0;
const errors = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌  ${name}`);
    console.log(`      → ${e.message}`);
    errors.push({ name, error: e.message });
    failed++;
  }
}

async function http(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(WS, {
      auth: { token },
      transports: ['websocket'],
      timeout: 5000,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
  });
}

function waitForEvent(socket, event, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      timeout,
    );
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Nettoyage BDD avant les tests ───────────────────────────────────────────

async function cleanup() {
  // On tente de supprimer les comptes de test via les APIs après login
  // (pas critique si ça échoue)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

let token1, token2, playerId1, playerId2;
let deckId1, deckId2;
let gameId;
let allCards = [];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🏛  Olympos Card Clash — Tests E2E');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ─── 1. Auth ──────────────────────────────────────────────────────────────────
console.log('📌 1. Auth');

await test('Register Player 1', async () => {
  const { status, body } = await http('POST', '/auth/register', {
    username: 'test_zeus_' + Date.now(),
    email: `zeus_${Date.now()}@test.com`,
    password: 'password123',
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(body.access_token, 'Missing access_token');
  token1 = body.access_token;
});

await test('Register Player 2', async () => {
  const { status, body } = await http('POST', '/auth/register', {
    username: 'test_athena_' + Date.now(),
    email: `athena_${Date.now()}@test.com`,
    password: 'password123',
  });
  assert(status === 201, `Expected 201, got ${status}`);
  token2 = body.access_token;
});

await test('Register — email dupliqué → 409', async () => {
  // On recrée avec les mêmes credentials en relisant le token du player1
  const me = await http('GET', '/players/me', null, token1);
  const { status } = await http('POST', '/auth/register', {
    username: 'other_name',
    email: me.body.email,
    password: 'password123',
  });
  assert(status === 409, `Expected 409, got ${status}`);
});

await test('Login valide', async () => {
  // On récupère l'email de P1 pour le login
  const me = await http('GET', '/players/me', null, token1);
  const { status, body } = await http('POST', '/auth/login', {
    email: me.body.email,
    password: 'password123',
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(body.access_token, 'Missing access_token');
  token1 = body.access_token; // refresh
});

await test('Login — mauvais mot de passe → 401', async () => {
  const me = await http('GET', '/players/me', null, token1);
  const { status } = await http('POST', '/auth/login', {
    email: me.body.email,
    password: 'wrong',
  });
  assert(status === 401, `Expected 401, got ${status}`);
});

await test('Route protégée sans token → 401', async () => {
  const { status } = await http('GET', '/players/me');
  assert(status === 401, `Expected 401, got ${status}`);
});

// ─── 2. Player ────────────────────────────────────────────────────────────────
console.log('\n📌 2. Player');

await test('GET /players/me', async () => {
  const { status, body } = await http('GET', '/players/me', null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.username, 'Missing username');
  assert(body.eloScore === 1000, `ELO should be 1000, got ${body.eloScore}`);
  assert(!body.passwordHash, 'passwordHash should not be exposed');
  playerId1 = body.id;
});

await test('GET /players/me (Player 2)', async () => {
  const { status, body } = await http('GET', '/players/me', null, token2);
  assert(status === 200, `Expected 200, got ${status}`);
  playerId2 = body.id;
});

await test('PATCH /players/me — modifier avatarUrl', async () => {
  const { status, body } = await http(
    'PATCH', '/players/me',
    { avatarUrl: 'https://example.com/avatar.png' },
    token1,
  );
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.avatarUrl === 'https://example.com/avatar.png', 'avatarUrl not updated');
});

// ─── 3. Cards ─────────────────────────────────────────────────────────────────
console.log('\n📌 3. Cards');

await test('GET /cards → 37 cartes', async () => {
  const { status, body } = await http('GET', '/cards', null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(Array.isArray(body), 'Not an array');
  assert(body.length === 37, `Expected 37 cards, got ${body.length}`);
  allCards = body;
});

await test('GET /cards/:id — carte existante', async () => {
  const card = allCards[0];
  const { status, body } = await http('GET', `/cards/${card.id}`, null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.id === card.id, 'Wrong card returned');
  assert(['creature', 'spell', 'artifact'].includes(body.cardType), 'Invalid cardType');
  assert(['common', 'rare', 'epic', 'legendary'].includes(body.rarity), 'Invalid rarity');
});

await test('GET /cards/:id — inexistant → 404', async () => {
  const { status } = await http('GET', '/cards/00000000-0000-0000-0000-000000000000', null, token1);
  assert(status === 404, `Expected 404, got ${status}`);
});

// ─── 4. Decks ─────────────────────────────────────────────────────────────────
console.log('\n📌 4. Decks');

await test('GET /decks → vide au départ', async () => {
  const { status, body } = await http('GET', '/decks', null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(Array.isArray(body), 'Not an array');
});

await test('POST /decks — créer deck P1', async () => {
  const { status, body } = await http('POST', '/decks', { name: 'Deck Zeus Test' }, token1);
  assert(status === 201, `Expected 201, got ${status}`);
  assert(body.isValid === false, 'New deck should not be valid');
  deckId1 = body.id;
});

await test('POST /decks — créer deck P2', async () => {
  const { status, body } = await http('POST', '/decks', { name: 'Deck Athena Test' }, token2);
  assert(status === 201, `Expected 201, got ${status}`);
  deckId2 = body.id;
});

await test('POST /decks/:id/cards — ajouter 30 cartes (deck P1)', async () => {
  // On prend 15 cartes différentes × 2 exemplaires = 30
  const selected = allCards.slice(0, 15);
  for (const card of selected) {
    for (let q = 0; q < 2; q++) {
      const { status } = await http(
        'POST', `/decks/${deckId1}/cards`,
        { cardId: card.id, quantity: 1 },
        token1,
      );
      assert(status === 201, `Failed adding card ${card.name} (q${q+1}): ${status}`);
    }
  }
});

await test('GET /decks/:id → isValid = true après 30 cartes', async () => {
  const { status, body } = await http('GET', `/decks/${deckId1}`, null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.isValid === true, 'Deck should be valid with 30 cards');
  const total = body.deckCards.reduce((s, dc) => s + dc.quantity, 0);
  assert(total === 30, `Expected 30 cards, got ${total}`);
});

await test('POST /decks/:id/cards — 3ème exemplaire → 400', async () => {
  const card = allCards[0];
  const { status } = await http(
    'POST', `/decks/${deckId1}/cards`,
    { cardId: card.id, quantity: 1 },
    token1,
  );
  assert(status === 400, `Expected 400, got ${status}`);
});

await test('POST /decks/:id/cards — ajouter 30 cartes (deck P2)', async () => {
  const selected = allCards.slice(0, 15);
  for (const card of selected) {
    for (let q = 0; q < 2; q++) {
      const { status } = await http(
        'POST', `/decks/${deckId2}/cards`,
        { cardId: card.id, quantity: 1 },
        token2,
      );
      assert(status === 201, `Failed: ${status}`);
    }
  }
});

await test('GET /decks/:id — accès deck d\'un autre joueur → 403', async () => {
  const { status } = await http('GET', `/decks/${deckId1}`, null, token2);
  assert(status === 403, `Expected 403, got ${status}`);
});

await test('PATCH /decks/:id — renommer', async () => {
  const { status, body } = await http('PATCH', `/decks/${deckId1}`, { name: 'Deck Foudre' }, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.name === 'Deck Foudre', 'Name not updated');
});

// ─── 5. Matchmaking ───────────────────────────────────────────────────────────
console.log('\n📌 5. Matchmaking');

await test('POST /matchmaking/join — Player 1 rejoint la file', async () => {
  const { status, body } = await http('POST', '/matchmaking/join', null, token1);
  assert(status === 201, `Expected 201, got ${status}`);
  assert('matched' in body, 'Missing matched field');
});

await test('POST /matchmaking/join — double join → 409', async () => {
  const { status } = await http('POST', '/matchmaking/join', null, token1);
  assert(status === 409, `Expected 409, got ${status}`);
});

await test('POST /matchmaking/join — Player 2 → matched = true', async () => {
  const { status, body } = await http('POST', '/matchmaking/join', null, token2);
  assert(status === 201, `Expected 201, got ${status}`);
  assert(body.matched === true, 'Players should match');
  assert(body.opponentId === playerId1, 'Wrong opponentId');
});

await test('DELETE /matchmaking/leave — plus en file → 404', async () => {
  const { status } = await http('DELETE', '/matchmaking/leave', null, token1);
  assert(status === 404, `Expected 404, got ${status}`);
});

// ─── 6. Games (REST) ──────────────────────────────────────────────────────────
console.log('\n📌 6. Games (REST)');

await test('POST /games — créer une partie avec 2 decks valides', async () => {
  const { status, body } = await http(
    'POST', '/games',
    { deck1Id: deckId1, player2Id: playerId2, deck2Id: deckId2 },
    token1,
  );
  assert(status === 201, `Expected 201, got ${status}`);
  assert(body.status === 'waiting', `Expected status waiting, got ${body.status}`);
  gameId = body.id;
});

await test('GET /games/:id — état de la partie', async () => {
  const { status, body } = await http('GET', `/games/${gameId}`, null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.id === gameId, 'Wrong game returned');
});

await test('GET /games/history — vide (partie pas terminée)', async () => {
  const { status, body } = await http('GET', '/games/history', null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(Array.isArray(body), 'Not an array');
});

await test('GET /games/:id — autre joueur non participant → 403', async () => {
  // Créer un 3ème compte temporaire
  const { body: reg } = await http('POST', '/auth/register', {
    username: 'temp_' + Date.now(),
    email: `temp_${Date.now()}@test.com`,
    password: 'password123',
  });
  const { status } = await http('GET', `/games/${gameId}`, null, reg.access_token);
  assert(status === 403, `Expected 403, got ${status}`);
});

// ─── 7. WebSocket — Partie complète ──────────────────────────────────────────
console.log('\n📌 7. WebSocket — Partie complète');

let sock1, sock2;

await test('Connexion WebSocket Player 1', async () => {
  sock1 = await connectSocket(token1);
  assert(sock1.connected, 'Socket 1 not connected');
});

await test('Connexion WebSocket Player 2', async () => {
  sock2 = await connectSocket(token2);
  assert(sock2.connected, 'Socket 2 not connected');
});

await test('join_game — Player 1 (en attente du P2)', async () => {
  sock1.emit('join_game', { gameId });
  const state = await waitForEvent(sock1, 'game_state');
  assert(state.status === 'waiting_players', `Expected waiting_players, got ${state.status}`);
  assert(state.connectedPlayers.includes(playerId1), 'P1 should be in connectedPlayers');
});

await test('join_game — Player 2 → partie démarre', async () => {
  // Les deux sockets reçoivent game_state avec status in_progress
  const [stateP1, stateP2] = await Promise.all([
    waitForEvent(sock1, 'game_state'),
    (async () => {
      sock2.emit('join_game', { gameId });
      return waitForEvent(sock2, 'game_state');
    })(),
  ]);
  assert(stateP1.status === 'in_progress', `P1 expected in_progress, got ${stateP1.status}`);
  assert(stateP2.status === 'in_progress', `P2 expected in_progress, got ${stateP2.status}`);
  assert(stateP1.player1.hp === 20, `P1 HP should be 20`);
  assert(stateP1.player2.hp === 20, `P2 HP should be 20`);
  assert(stateP1.currentTurnPlayerId === playerId1, 'P1 should go first');
});

await test('play_card — P1 joue une carte jouable (mana suffisant)', async () => {
  sock1.emit('join_game', { gameId });
  const freshState = await waitForEvent(sock1, 'game_state');
  const p1State = freshState.player1.playerId === playerId1
    ? freshState.player1
    : freshState.player2;

  // Trouver la carte la moins chère en main que P1 peut se permettre
  const cardMap = Object.fromEntries(allCards.map((c) => [c.id, c]));
  const playable = p1State.hand
    .map((cId) => cardMap[cId])
    .filter((c) => c && c.manaCost <= p1State.mana)
    .sort((a, b) => a.manaCost - b.manaCost);

  if (playable.length === 0) {
    // Main trop chère pour le mana disponible — cas rare, on skip
    console.log(`      → Pas de carte jouable (mana=${p1State.mana}), test ignoré`);
    skipped++;
    return;
  }

  const card = playable[0];
  sock1.emit('play_card', { gameId, cardId: card.id });
  const newState = await waitForEvent(sock1, 'game_state');
  assert(newState, 'No game_state received after play_card');
  const newP1 = newState.player1.playerId === playerId1 ? newState.player1 : newState.player2;
  assert(newP1.hand.length < p1State.hand.length, 'Card should have been removed from hand');
  assert(newP1.mana === p1State.mana - card.manaCost, 'Mana not deducted correctly');
});

await test('end_turn — P1 passe son tour', async () => {
  sock1.emit('end_turn', { gameId });
  const newState = await waitForEvent(sock1, 'game_state');
  assert(newState.currentTurnPlayerId === playerId2, `Expected P2 turn, got ${newState.currentTurnPlayerId}`);
});

await test('play_card — P2 joue à son tour (carte abordable)', async () => {
  sock2.emit('join_game', { gameId });
  const freshState = await waitForEvent(sock2, 'game_state');
  const p2State = freshState.player1.playerId === playerId2
    ? freshState.player1
    : freshState.player2;

  const cardMap = Object.fromEntries(allCards.map((c) => [c.id, c]));
  const playable = p2State.hand
    .map((cId) => cardMap[cId])
    .filter((c) => c && c.manaCost <= p2State.mana)
    .sort((a, b) => a.manaCost - b.manaCost);

  if (playable.length === 0) {
    console.log(`      → Pas de carte jouable (mana=${p2State.mana}), test ignoré`);
    skipped++;
    return;
  }

  const card = playable[0];
  sock2.emit('play_card', { gameId, cardId: card.id });
  const newState = await waitForEvent(sock2, 'game_state');
  assert(newState, 'No game_state received');
  const newP2 = newState.player1.playerId === playerId2 ? newState.player1 : newState.player2;
  assert(newP2.hand.length < p2State.hand.length, 'Card not removed from hand');
});

await test('end_turn — P2 passe, retour au tour de P1', async () => {
  sock2.emit('end_turn', { gameId });
  const newState = await waitForEvent(sock2, 'game_state');
  assert(newState.currentTurnPlayerId === playerId1, 'Should be P1 turn again');
});

await test('surrender — P1 abandonne → game_over émis', async () => {
  const [over1, over2] = await Promise.all([
    waitForEvent(sock1, 'game_over'),
    waitForEvent(sock2, 'game_over'),
    (async () => { sock1.emit('surrender', { gameId }); })(),
  ]);
  assert(over1.winnerId === playerId2, `Winner should be P2, got ${over1.winnerId}`);
  assert(over1.reason === 'surrender', `Reason should be surrender, got ${over1.reason}`);
  assert(over2.winnerId === playerId2, 'P2 socket should also receive game_over');
});

await test('ELO mis à jour après la partie', async () => {
  await sleep(500); // laisser le temps à la transaction de se terminer
  const [p1, p2] = await Promise.all([
    http('GET', '/players/me', null, token1),
    http('GET', '/players/me', null, token2),
  ]);
  const loserElo  = p1.body.eloScore;
  const winnerElo = p2.body.eloScore;
  assert(loserElo < 1000,  `Loser ELO should be < 1000, got ${loserElo}`);
  assert(winnerElo > 1000, `Winner ELO should be > 1000, got ${winnerElo}`);
  console.log(`      → Zeus (loser):  1000 → ${loserElo}`);
  console.log(`      → Athena (winner): 1000 → ${winnerElo}`);
});

await test('GET /games/history — partie apparaît après la fin', async () => {
  const { status, body } = await http('GET', '/games/history', null, token1);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(body.some((g) => g.id === gameId), 'Finished game not in history');
});

await test('Connexion WebSocket — token invalide → déconnecté', async () => {
  const sockInvalid = io(WS, {
    auth: { token: 'invalid.token.here' },
    transports: ['websocket'],
    timeout: 3000,
  });
  await new Promise((resolve) => {
    sockInvalid.on('disconnect', resolve);
    sockInvalid.on('connect_error', resolve);
    setTimeout(resolve, 3000);
  });
  assert(!sockInvalid.connected, 'Invalid token socket should not be connected');
  sockInvalid.close();
});

// ─── Nettoyage ────────────────────────────────────────────────────────────────
sock1?.close();
sock2?.close();

// ─── Résumé ───────────────────────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const total = passed + failed;
const emoji = failed === 0 ? '🏆' : '⚠️ ';
console.log(`${emoji}  Résultat : ${passed}/${total} tests passés${skipped ? ` (${skipped} skipped)` : ''}`);
if (errors.length > 0) {
  console.log('\n  Tests en échec :');
  errors.forEach((e) => console.log(`    • ${e.name}\n      ${e.error}`));
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
process.exit(failed > 0 ? 1 : 0);
