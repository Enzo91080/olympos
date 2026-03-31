# Olympos: Card Clash — Contexte Projet

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

## Stack Technique

### Frontend (pas encore commencé)
- React 18 + Vite
- Zustand (état global)
- Framer Motion (animations)
- Socket.io-client (WebSocket)

### Backend (à initialiser)
- Node.js + NestJS
- Prisma ORM
- PostgreSQL via Docker
- Redis via Docker
- JWT + bcrypt (auth)
- Socket.io (WebSocket serveur)

## Structure du projet (Monorepo)

olympos/
├── CONTEXT.md
├── docker-compose.yml        ← PostgreSQL + Redis, à la racine
├── backend/                  ← Projet NestJS
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
└── frontend/                 ← Projet React (à venir)
    └── src/

## Conventions importantes
- Toutes les commandes Prisma se lancent depuis `backend/`
- Toutes les commandes npm se lancent depuis `backend/`
- Le docker-compose.yml est toujours à la racine `olympos/`
- Les variables d'environnement sont dans `backend/.env`
- Ne jamais créer de fichiers en dehors de cette structure

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

## Règles métier importantes
- Le serveur est la seule source de vérité (pas de confiance au client)
- Toutes les actions sont validées côté serveur avant d'être appliquées
- L'état de partie est stocké dans Redis (TTL 10 min pour reconnexion)
- Passé le TTL, la partie est déclarée forfait pour le joueur déconnecté
- Le matchmaking apparie des joueurs avec un écart ELO max de 200 points

## Variables d'environnement (.env)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/olympos?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="olympos_super_secret_key_change_in_prod"
JWT_EXPIRES_IN="7d"
PORT=3000
```

---

### Ensuite dans Claude Code, commence toujours par :
```
Lis le fichier CONTEXT.md avant de faire quoi que ce soit.
Ensuite initialise le projet backend complet selon ce contexte :
- Crée le docker-compose.yml avec PostgreSQL et Redis
- Initialise NestJS + Prisma
- Crée tous les modules définis dans le contexte
- Lance les migrations Prisma
- Vérifie que le serveur démarre
```

---

### Astuce pour la suite

À chaque nouvelle session Claude Code, commence toujours par :
```
Lis CONTEXT.md pour te remettre dans le contexte du projet.