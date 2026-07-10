import { Test, TestingModule } from '@nestjs/testing';
import { EloService } from './elo.service';

let service: EloService;

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [EloService],
  }).compile();

  service = module.get<EloService>(EloService);
});

describe('compute', () => {
  it('à elo égal, le gagnant gagne +16 et le perdant perd -16', () => {
    const result = service.compute(
      { id: 'w', elo: 1200 },
      { id: 'l', elo: 1200 },
    );
    expect(result).toEqual({
      winnerId: 'w',
      newWinnerElo: 1216,
      loserId: 'l',
      newLoserElo: 1184,
    });
  });

  it('un outsider qui gagne contre un elo bien plus haut gagne plus de points', () => {
    const upset = service.compute(
      { id: 'w', elo: 1000 },
      { id: 'l', elo: 1400 },
    );
    const expected = service.compute(
      { id: 'w', elo: 1200 },
      { id: 'l', elo: 1200 },
    );
    expect(upset.newWinnerElo - 1000).toBeGreaterThan(
      expected.newWinnerElo - 1200,
    );
  });

  it('un favori qui gagne contre un elo bien plus bas gagne peu de points', () => {
    const expected = service.compute(
      { id: 'w', elo: 1400 },
      { id: 'l', elo: 1000 },
    );
    expect(expected.newWinnerElo - 1400).toBeLessThan(16);
    expect(expected.newWinnerElo - 1400).toBeGreaterThanOrEqual(0);
  });

  it('conserve les identifiants winnerId/loserId fournis', () => {
    const result = service.compute(
      { id: 'player-A', elo: 1500 },
      { id: 'player-B', elo: 1500 },
    );
    expect(result.winnerId).toBe('player-A');
    expect(result.loserId).toBe('player-B');
  });
});
