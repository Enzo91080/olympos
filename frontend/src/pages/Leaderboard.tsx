import { useEffect, useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

interface LeaderboardEntry {
  id: string
  username: string
  eloScore: number
  avatarUrl?: string
}

function rankFromElo(elo: number): string {
  if (elo >= 2000) return 'Légende'
  if (elo >= 1800) return 'Diamant'
  if (elo >= 1600) return 'Platine'
  if (elo >= 1400) return 'Or'
  if (elo >= 1200) return 'Argent'
  return 'Bronze'
}

function rankColor(rank: string): string {
  switch (rank) {
    case 'Légende': return 'text-primary'
    case 'Diamant': return 'text-blue-400'
    case 'Platine': return 'text-cyan-400'
    case 'Or': return 'text-yellow-400'
    case 'Argent': return 'text-gray-300'
    default: return 'text-orange-400'
  }
}

export default function Leaderboard() {
  const { player } = useAuthStore()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<LeaderboardEntry[]>('/players/leaderboard')
      .then(({ data }) => setEntries(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="flex min-h-screen overflow-x-hidden"
      style={{
        backgroundColor: '#0a0e1a',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0V0zm10 10v40h40V10H10zm5 5h30v30H15V15zm5 5v20h20V20H20z' fill='%23171b28' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E\")",
        color: '#dfe2f3',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <Sidebar />

      <main className="ml-64 flex-1 relative min-h-screen">
        <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-surface-container-lowest font-headline tracking-wider shadow-[0_4px_20px_rgba(51,34,111,0.08)]">
          <div className="text-2xl font-bold uppercase tracking-tighter text-primary">Panthéon</div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-primary">groups</span>
            {entries.length} guerriers divins
          </div>
        </header>

        <div className="p-8 max-w-3xl mx-auto space-y-4">
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
                const pos = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
                const heights = ['h-24', 'h-32', 'h-20']
                const medals = ['🥈', '🥇', '🥉']
                return (
                  <div key={entry.id} className={`flex flex-col items-center justify-end ${heights[podiumIdx]}`}>
                    <div className="text-2xl mb-1">{medals[podiumIdx]}</div>
                    <div className="w-12 h-12 rounded-full bg-surface-container-highest border-2 border-primary/40 flex items-center justify-center mb-2">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface truncate max-w-[80px] text-center">{entry.username}</p>
                    <p className="text-[10px] text-primary font-bold">{entry.eloScore} ELO</p>
                    <div className={`w-full mt-2 rounded-t-lg bg-surface-container-highest flex items-center justify-center py-3 border border-outline-variant/20 ${pos === 1 ? 'bg-primary/10 border-primary/30' : ''}`}>
                      <span className="font-headline font-black text-2xl text-on-surface-variant">#{pos}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full list */}
          <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">emoji_events</span>
              <h3 className="font-headline text-xl text-primary">Hall des Champions</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-12">Aucun joueur pour l'instant. Sois le premier !</p>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {entries.map((entry, idx) => {
                  const rank = rankFromElo(entry.eloScore)
                  const isMe = entry.id === player?.id
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors ${isMe ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-surface-container-low'}`}
                    >
                      <span className={`w-8 text-center font-headline font-black text-lg ${idx < 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary-container">person</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${isMe ? 'text-primary' : 'text-on-surface'}`}>
                          {entry.username} {isMe && <span className="text-[10px] text-primary/60 font-normal">(toi)</span>}
                        </p>
                        <p className={`text-[10px] uppercase tracking-widest font-bold ${rankColor(rank)}`}>{rank}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-headline font-bold text-on-surface">{entry.eloScore.toLocaleString()}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">ELO</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
