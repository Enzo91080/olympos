# Olympos: Card Clash — Contexte Projet

## ⚠️ Instructions pour Claude Code
- Lis TOUJOURS ce fichier en entier avant de faire quoi que ce soit
- Lis TOUJOURS les fichiers design dans l'ordre indiqué ci-dessous
- Ne jamais créer de fichiers en dehors de la structure monorepo définie
- Ne jamais demander de confirmation entre les étapes, exécute tout d'un coup
- Toujours vérifier que le serveur démarre sans erreur après chaque modification
- En cas de doute sur un chemin de fichier, relis la section "Structure du projet"
- Ne jamais hardcoder de couleurs — utiliser uniquement les classes Tailwind du design system

---

## Concept
Jeu de cartes stratégique en ligne, tour par tour, 1v1.
Thématique : Mythologie grecque.
Les joueurs incarnent des dieux olympiens et s'affrontent avec des decks
de héros, créatures, sorts et artefacts divins.
Durée max par partie : 30 minutes.
Deck : 30 cartes max, 2 exemplaires max par carte.

## Fonctionnalités
- Deck construction (30 cartes, max 2 doublons)
- Matchmaking ELO avec file d'attente temps réel
- Parties 1v1 en temps réel via WebSocket
- Galerie de cartes avec animations
- Historique des parties et statistiques
- Système de comptes (inscription, connexion, profil)

---

## Structure du projet (Monorepo)

```
olympos/
├── CONTEXT.md
├── docker-compose.yml              ← PostgreSQL + Redis, à la racine
├── design/                         ← Fichiers Stitch (référence design)
│   ├── aura_of_olympus/
│   │   └── DESIGN.md              ← Système de design global (tokens, typo, règles)
│   ├── login_register/
│   │   ├── code.html              ← Code Stitch de référence Login
│   │   └── screen.png             ← Capture visuelle Login
│   ├── dashboard/
│   │   ├── code.html              ← Code Stitch de référence Dashboard
│   │   └── screen.png             ← Capture visuelle Dashboard
│   ├── deck_builder/
│   │   ├── code.html              ← Code Stitch de référence Deck Builder
│   │   └── screen.png             ← Capture visuelle Deck Builder
│   └── game_board/
│       ├── code.html              ← Code Stitch de référence Game Board
│       └── screen.png             ← Capture visuelle Game Board
├── backend/                        ← Projet NestJS
│   ├── .env
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── auth/
│       ├── player/
│       ├── deck/
│       ├── card/
│       ├── game/
│       ├── matchmaking/
│       └── gateway/
└── frontend/                       ← Projet React + Vite
    ├── .env
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx
        │   │   └── Topbar.tsx
        │   ├── ui/
        │   │   ├── Button.tsx
        │   │   ├── Card.tsx
        │   │   ├── StatCard.tsx
        │   │   └── Badge.tsx
        │   └── game/
        │       ├── GameCard.tsx
        │       ├── PlayerZone.tsx
        │       └── BattleLog.tsx
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   ├── DeckBuilder.tsx
        │   └── GameBoard.tsx
        ├── store/
        │   ├── authStore.ts
        │   ├── deckStore.ts
        │   └── gameStore.ts
        ├── services/
        │   ├── api.ts
        │   ├── authService.ts
        │   ├── deckService.ts
        │   └── gameService.ts
        ├── socket/
        │   └── gameSocket.ts
        ├── router/
        │   └── index.tsx
        ├── App.tsx
        └── main.tsx
```

---

## Conventions importantes
- Toutes les commandes Prisma se lancent depuis `backend/`
- Toutes les commandes npm backend se lancent depuis `backend/`
- Toutes les commandes npm frontend se lancent depuis `frontend/`
- Le docker-compose.yml est toujours à la racine `olympos/`
- Les variables d'environnement backend sont dans `backend/.env`
- Les variables d'environnement frontend sont dans `frontend/.env`
- Ne jamais créer de fichiers en dehors de cette structure

---

## Stack Technique

### Frontend
- React 18 + Vite
- TypeScript strict
- Tailwind CSS (config copiée exactement depuis design/login_register/code.html)
- Zustand (état global)
- Framer Motion (animations)
- Socket.io-client (WebSocket)
- React Router v6 (navigation)
- Axios (appels API)
- Fonts : Noto Serif (headlines) + Manrope (body) via Google Fonts

### Backend
- Node.js + NestJS
- Prisma ORM
- PostgreSQL 15 via Docker
- Redis 7 via Docker
- JWT + bcrypt (auth)
- Socket.io (WebSocket serveur)

---

## Variables d'environnement

### backend/.env
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/olympos?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="olympos_super_secret_key_change_in_prod"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### frontend/.env
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_USE_MOCK=true
```

---

## Design — Fichiers de référence (dans /design)

### Ordre de lecture obligatoire avant de coder le frontend
1. `design/aura_of_olympus/DESIGN.md` — système de design complet, tokens, typographie, règles
2. `design/login_register/code.html` — référence Login (contient le tailwind.config complet à copier)
3. `design/dashboard/code.html` — référence Dashboard
4. `design/deck_builder/code.html` — référence Deck Builder
5. `design/game_board/code.html` — référence Game Board

### Règles d'utilisation des fichiers design
- Le `code.html` de chaque dossier est le code Stitch à convertir en composant React pixel perfect
- Adapter uniquement la syntaxe JSX (className au lieu de class, etc.)
- Le `screen.png` est la capture visuelle de référence finale
- Le `tailwind.config` du fichier `design/login_register/code.html` fait référence absolue
  → le copier exactement dans `frontend/tailwind.config.js`

### Fonts
- Headlines / Titres : Noto Serif
- Body / Labels : Manrope
- À importer dans `frontend/index.html` depuis Google Fonts

### Navigation sidebar (visible sur dashboard, deck_builder, game_board)
- Battlefront → /dashboard
- Armory → /deck-builder
- Pantheon → /leaderboard
- Treasury → /shop
- Archives → /history

### Pages à développer
1. Login / Register → /login (design/login_register/)
2. Dashboard → /dashboard (design/dashboard/)
3. Deck Builder → /deck-builder (design/deck_builder/)
4. Game Board → /game/:id (design/game_board/)

---

## Routes frontend (React Router)
```
/ → redirect /dashboard si connecté, sinon /login
/login → Login / Register (public)
/dashboard → Dashboard Battlefront (protégé par JWT)
/deck-builder → Deck Builder liste (protégé)
/deck-builder/:deckId → Deck Builder édition (protégé)
/game/:gameId → Game Board (protégé)
/leaderboard → Classement (protégé)
/history → Historique parties (protégé)
```

---

## Base de données — Modèles Prisma

### Player
- id: UUID (PK)
- username: String (unique)
- email: String (unique)
- passwordHash: String
- eloScore: Int (default 1000)
- avatarUrl: String?
- createdAt: DateTime
- updatedAt: DateTime

### Card (référentiel immuable, géré par les admins)
- id: UUID (PK)
- name: String
- cardType: String (creature | spell | artifact)
- manaCost: Int
- attack: Int?
- defense: Int?
- effectText: String?
- rarity: String (common | rare | epic | legendary)
- imageUrl: String?
- createdAt: DateTime

### Deck
- id: UUID (PK)
- playerId: UUID (FK → Player)
- name: String
- isValid: Boolean (default false)
- createdAt: DateTime
- updatedAt: DateTime

### DeckCard (table de jonction)
- deckId: UUID (PK, FK → Deck)
- cardId: UUID (PK, FK → Card)
- quantity: Int (default 1, max 2)

### Game
- id: UUID (PK)
- player1Id: UUID (FK → Player)
- player2Id: UUID (FK → Player)
- deck1Id: UUID (FK → Deck)
- deck2Id: UUID (FK → Deck)
- winnerId: UUID? (FK → Player)
- status: String (waiting | in_progress | finished | abandoned)
- startedAt: DateTime?
- endedAt: DateTime?

### GameAction
- id: UUID (PK)
- gameId: UUID (FK → Game)
- playerId: UUID (FK → Player)
- cardId: UUID? (FK → Card)
- actionType: String (play_card | attack | cast_spell | end_turn | surrender)
- turnNumber: Int
- payload: Json?
- createdAt: DateTime

### MatchmakingQueue
- id: UUID (PK)
- playerId: UUID (FK → Player, unique)
- status: String (waiting | matched | cancelled)
- eloMin: Int
- eloMax: Int
- joinedAt: DateTime

---

## Architecture Backend — Modules NestJS

### AuthModule
- POST /auth/register → inscription
- POST /auth/login → connexion + JWT
- Guard JWT global

### PlayerModule
- GET /players/me → profil connecté
- PATCH /players/me → modifier profil

### DeckModule
- GET /decks → mes decks
- POST /decks → créer un deck
- GET /decks/:id → détail deck
- PATCH /decks/:id → modifier deck
- DELETE /decks/:id → supprimer deck
- POST /decks/:id/cards → ajouter carte
- DELETE /decks/:id/cards/:cardId → retirer carte

### CardModule
- GET /cards → liste toutes les cartes
- GET /cards/:id → détail carte

### GameModule
- POST /games → créer une partie
- GET /games/:id → état d'une partie
- GET /games/history → historique du joueur

### MatchmakingModule
- POST /matchmaking/join → rejoindre la file
- DELETE /matchmaking/leave → quitter la file

---

## WebSocket — GameGateway (Socket.io)

### Événements reçus (client → serveur)
- join_game : rejoindre la room d'une partie
- play_card : jouer une carte
- end_turn : passer son tour
- surrender : abandonner

### Événements émis (serveur → client)
- game_state : état complet de la partie
- game_action : action jouée par l'adversaire
- game_over : fin de partie avec résultat

---

## Règles métier importantes
- Le serveur est la seule source de vérité (pas de confiance au client)
- Toutes les actions sont validées côté serveur avant d'être appliquées
- L'état de partie est stocké dans Redis (TTL 10 min pour reconnexion)
- Passé le TTL, la partie est déclarée forfait pour le joueur déconnecté
- Le matchmaking apparie des joueurs avec un écart ELO max de 200 points
- Un deck est valide si et seulement si il contient exactement 30 cartes
- Maximum 2 exemplaires de la même carte par deck

---

## État d'avancement

### ✅ Terminé
- Document de cadrage (MCD, MLD, MPD)
- Fichier CONTEXT.md
- Design system Stitch (4 pages + DESIGN.md dans /design)
- Backend NestJS complet (Auth JWT, Player, Card, Deck, Game, Matchmaking, Gateway WebSocket, Oracle IA)
- Frontend React complet (Login/Register, Dashboard, Deck Builder, Game Board, Leaderboard, History)
- Mode solo (bot) et mode PvP (matchmaking ELO)
- Fonctionnalité IA Oracle (Ollama + streaming SSE)

### ⏳ À faire (voir README — section Limites & pistes d'amélioration)
- Tests end-to-end (HTTP + WebSocket)
- Déploiement (Railway / Vercel) — le projet tourne actuellement en local uniquement
- Fonctionnalités "Nice to have" : boutique de cartes, mode spectateur
