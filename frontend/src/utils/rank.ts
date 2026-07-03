// Seuils de rang ELO — conformes aux tiers documentés dans README.md.
// Ne pas confondre avec authService.ts::eloToRank, qui utilise une échelle
// différente (labels anglais) pour le rang affiché dans la Sidebar — hors
// périmètre de cet utilitaire, volontairement non unifié.
export const RANK_TIERS = ['Légende', 'Diamant', 'Platine', 'Or', 'Argent', 'Bronze'] as const
export type RankTier = (typeof RANK_TIERS)[number]

export function rankFromElo(elo: number): RankTier {
  if (elo >= 2000) return 'Légende'
  if (elo >= 1800) return 'Diamant'
  if (elo >= 1600) return 'Platine'
  if (elo >= 1400) return 'Or'
  if (elo >= 1200) return 'Argent'
  return 'Bronze'
}

export function rankColor(rank: string): string {
  switch (rank) {
    case 'Légende': return 'text-primary'
    case 'Diamant': return 'text-blue-400'
    case 'Platine': return 'text-cyan-400'
    case 'Or': return 'text-yellow-400'
    case 'Argent': return 'text-gray-300'
    default: return 'text-orange-400'
  }
}
