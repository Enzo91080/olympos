export interface CardOnBoard {
  instanceId: string;   // UUID unique par instance posée (pas le cardId)
  cardId: string;
  name: string;
  attack: number;
  defense: number;
  canAttack: boolean;   // false le tour de pose (summoning sickness)
}

export interface PlayerState {
  playerId: string;
  hp: number;           // Points de vie (20 au départ)
  mana: number;         // Mana disponible ce tour
  maxMana: number;      // Max mana (augmente de 1 par tour, plafonné à 10)
  hand: string[];       // cardIds dans la main
  deckRemaining: string[];  // cardIds restants dans le deck (déjà mélangé)
  board: CardOnBoard[];
}

export interface GameState {
  gameId: string;
  player1: PlayerState;
  player2: PlayerState;
  currentTurnPlayerId: string;
  turnNumber: number;
  connectedPlayers: string[];
  status: 'waiting_players' | 'in_progress' | 'finished';
  winnerId?: string;
}
