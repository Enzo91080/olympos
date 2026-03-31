import { Injectable } from '@nestjs/common';

const K = 32;

@Injectable()
export class EloService {
  compute(
    winner: { id: string; elo: number },
    loser: { id: string; elo: number },
  ): { winnerId: string; newWinnerElo: number; loserId: string; newLoserElo: number } {
    const expectedWin = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const expectedLoss = 1 - expectedWin;

    return {
      winnerId: winner.id,
      newWinnerElo: Math.round(winner.elo + K * (1 - expectedWin)),
      loserId: loser.id,
      newLoserElo: Math.round(loser.elo + K * (0 - expectedLoss)),
    };
  }
}
