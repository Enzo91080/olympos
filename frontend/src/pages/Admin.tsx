import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import { useAuthStore } from '../store/authStore'
import { adminService } from '../services/adminService'
import type {
  AdminPlayer, AdminGame, AdminGameDetail, CardInput, AdminStats, AdminAuditEntry,
} from '../services/adminService'
import type { Card } from '../store/deckStore'

type Tab = 'stats' | 'cards' | 'players' | 'games' | 'audit'

const TAB_LABELS: Record<Tab, string> = {
  stats: 'Statistiques',
  cards: 'Cartes',
  players: 'Joueurs',
  games: 'Parties',
  audit: 'Journal',
}

const CARD_TYPES: CardInput['cardType'][] = ['creature', 'spell', 'artifact']
const RARITIES: CardInput['rarity'][] = ['common', 'rare', 'epic', 'legendary']

const EMPTY_CARD: CardInput = {
  name: '',
  cardType: 'creature',
  manaCost: 1,
  attack: undefined,
  defense: undefined,
  effectText: '',
  rarity: 'common',
  imageUrl: '',
  spellTarget: '',
}

export default function Admin() {
  const navigate = useNavigate()
  const { player } = useAuthStore()
  const [tab, setTab] = useState<Tab>('stats')

  useEffect(() => {
    if (player && player.role !== 'admin') navigate('/dashboard', { replace: true })
  }, [player])

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-40 bg-surface-container-lowest font-headline tracking-wider shadow-[0_4px_20px_rgba(51,34,111,0.08)]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">shield_person</span>
            <span className="text-2xl font-bold uppercase tracking-tighter text-secondary">Back-office Admin</span>
          </div>
          <div className="flex gap-2">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  tab === t
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container-highest text-on-surface-variant hover:text-secondary'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </header>

        <div className="p-8">
          {tab === 'stats' && <StatsPanel />}
          {tab === 'cards' && <CardsPanel />}
          {tab === 'players' && <PlayersPanel />}
          {tab === 'games' && <GamesPanel />}
          {tab === 'audit' && <AuditPanel />}
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Statistiques
// ─────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  waiting: 'En attente',
  in_progress: 'En cours',
  finished: 'Terminées',
  abandoned: 'Abandonnées',
}

// Rampe ordinale à teinte unique (or), du rang le plus haut (clair) au plus
// bas (sombre) — cohérent avec le thème "or = prestige" déjà utilisé ailleurs
// dans l'app (primary, .ichor-gradient). Ordre = ordre des rangs, jamais permuté.
const RANK_RAMP: Record<string, string> = {
  'Légende': '#ebd7a2',
  'Diamant': '#e1c170',
  'Platine': '#d6ab3d',
  'Or': '#b99027',
  'Argent': '#8f6f1e',
  'Bronze': '#7d6420',
}

function KpiTile({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-surface-container-highest rounded-xl p-6 text-center shadow-xl">
      <span className="material-symbols-outlined text-primary text-2xl mb-1 block">{icon}</span>
      <p className="text-4xl font-black text-on-surface font-headline">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{label}</p>
    </div>
  )
}

function StatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
      </div>
    )
  }
  if (!stats) return null

  const maxEloCount = Math.max(1, ...stats.eloDistribution.map((d) => d.count))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KpiTile label="Joueurs" value={stats.players.total} icon="groups" />
        <KpiTile label="Parties totales" value={stats.games.total} icon="sports_kabaddi" />
        {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((s) => (
          <KpiTile key={s} label={STATUS_LABELS[s]} value={stats.games.byStatus[s as keyof typeof stats.games.byStatus]} icon="donut_small" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition ELO — bar chart ordinal, une teinte, labels directs */}
        <section className="bg-surface-container-highest rounded-xl p-6 shadow-xl">
          <h3 className="font-headline text-xl text-primary mb-4">Répartition des rangs ELO</h3>
          <div className="space-y-2">
            {stats.eloDistribution.map((d) => (
              <div key={d.tier} className="flex items-center gap-3">
                <span className="w-16 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right shrink-0">
                  {d.tier}
                </span>
                <div className="flex-1 h-5 bg-surface-container-lowest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(4, (d.count / maxEloCount) * 100)}%`,
                      backgroundColor: RANK_RAMP[d.tier] ?? '#8f6f1e',
                    }}
                  >
                    {d.count > 0 && (
                      <span className="text-[10px] font-bold text-surface-dim">{d.count}</span>
                    )}
                  </div>
                </div>
                {d.count === 0 && <span className="w-6 text-[10px] text-on-surface-variant">0</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Cartes les plus jouées */}
        <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-outline-variant/20">
            <h3 className="font-headline text-xl text-primary">Cartes les plus jouées</h3>
          </div>
          {stats.topCards.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-12">Aucune carte jouée pour l'instant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
                  <th className="px-6 py-3">Carte</th>
                  <th className="px-4 py-3">Rareté</th>
                  <th className="px-4 py-3 text-right">Jouée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {stats.topCards.map((c) => (
                  <tr key={c.cardId} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-3 font-bold text-on-surface">{c.name}</td>
                    <td className="px-4 py-3 capitalize text-on-surface-variant">{c.rarity}</td>
                    <td className="px-4 py-3 text-right text-primary font-bold">{c.count}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Cartes
// ─────────────────────────────────────────────────────────────────────────

type CardSortKey = 'name' | 'cardType' | 'manaCost' | 'rarity'

function CardsPanel() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Card | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'All Types' | CardInput['cardType']>('All Types')
  const [filterRarity, setFilterRarity] = useState<'All Rarities' | CardInput['rarity']>('All Rarities')
  const [sortKey, setSortKey] = useState<CardSortKey>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const load = async () => {
    setLoading(true)
    try {
      setCards(await adminService.getCards())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (card: Card) => {
    if (!confirm(`Supprimer la carte "${card.name}" ?`)) return
    setError(null)
    try {
      await adminService.deleteCard(card.id)
      await load()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Suppression impossible')
    }
  }

  const handleSort = (key: CardSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else { setSortKey(key); setSortDir(1) }
  }

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((c) =>
      (filterType === 'All Types' || c.cardType === filterType) &&
      (filterRarity === 'All Rarities' || c.rarity === filterRarity) &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase())),
    )
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === bv) return 0
      return (av > bv ? 1 : -1) * sortDir
    })
  }, [cards, search, filterType, filterRarity, sortKey, sortDir])

  return (
    <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-headline text-xl text-primary">Cartes ({visibleCards.length}/{cards.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="admin-input !w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
            <option>All Types</option>
            {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="admin-input !w-auto" value={filterRarity} onChange={(e) => setFilterRarity(e.target.value as any)}>
            <option>All Rarities</option>
            {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
            <input
              className="admin-input !w-48 !pl-8"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all"
          >
            + Nouvelle carte
          </button>
        </div>
      </div>

      {error && <p className="px-6 py-2 text-xs text-error bg-error/10">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
                <SortableTh label="Nom" sortKey="name" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-6 py-3" />
                <SortableTh label="Type" sortKey="cardType" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <SortableTh label="Coût" sortKey="manaCost" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <th className="px-4 py-3">ATK</th>
                <th className="px-4 py-3">DEF</th>
                <SortableTh label="Rareté" sortKey="rarity" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <th className="px-4 py-3">Ciblage</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {visibleCards.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-3 font-bold text-on-surface">{c.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{c.cardType}</td>
                  <td className="px-4 py-3 text-secondary font-bold">{c.manaCost}</td>
                  <td className="px-4 py-3 text-primary">{c.attack ?? '—'}</td>
                  <td className="px-4 py-3 text-error">{c.defense ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-on-surface-variant">{c.rarity}</td>
                  <td className="px-4 py-3 text-[10px] text-on-surface-variant">{c.spellTarget ?? '—'}</td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button
                      onClick={() => { setEditing(c); setShowForm(true) }}
                      className="text-primary hover:underline text-xs font-bold uppercase"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-error hover:underline text-xs font-bold uppercase"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CardFormModal
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await load() }}
        />
      )}
    </section>
  )
}

function CardFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Card | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CardInput>(
    initial
      ? {
          name: initial.name,
          cardType: initial.cardType,
          manaCost: initial.manaCost,
          attack: initial.attack ?? undefined,
          defense: initial.defense ?? undefined,
          effectText: initial.effectText ?? '',
          rarity: initial.rarity,
          imageUrl: initial.imageUrl ?? '',
          spellTarget: initial.spellTarget ?? '',
        }
      : EMPTY_CARD,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Le nom est requis'); return }
    setSaving(true)
    setError(null)
    try {
      const payload: CardInput = {
        ...form,
        attack: form.attack === undefined || (form.attack as any) === '' ? null : Number(form.attack),
        defense: form.defense === undefined || (form.defense as any) === '' ? null : Number(form.defense),
        effectText: form.effectText || null,
        imageUrl: form.imageUrl || null,
        spellTarget: form.spellTarget || null,
        manaCost: Number(form.manaCost),
      }
      if (initial) await adminService.updateCard(initial.id, payload)
      else await adminService.createCard(payload)
      onSaved()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface-container-low rounded-xl border border-primary/20 shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-xl font-black text-primary uppercase tracking-widest">
            {initial ? 'Éditer la carte' : 'Nouvelle carte'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && <p className="mb-4 text-xs text-error bg-error/10 px-3 py-2 rounded">{error}</p>}

        <div className="space-y-4">
          <Field label="Nom">
            <input
              className="admin-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select
                className="admin-input"
                value={form.cardType}
                onChange={(e) => setForm({ ...form, cardType: e.target.value as CardInput['cardType'] })}
              >
                {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Rareté">
              <select
                className="admin-input"
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value as CardInput['rarity'] })}
              >
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Coût mana">
              <input
                type="number"
                className="admin-input"
                value={form.manaCost}
                onChange={(e) => setForm({ ...form, manaCost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Attaque">
              <input
                type="number"
                className="admin-input"
                value={form.attack ?? ''}
                onChange={(e) => setForm({ ...form, attack: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </Field>
            <Field label="Défense">
              <input
                type="number"
                className="admin-input"
                value={form.defense ?? ''}
                onChange={(e) => setForm({ ...form, defense: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Texte d'effet">
            <textarea
              className="admin-input"
              rows={2}
              value={form.effectText ?? ''}
              onChange={(e) => setForm({ ...form, effectText: e.target.value })}
            />
          </Field>

          <Field label="Ciblage (spellTarget, optionnel)">
            <input
              className="admin-input"
              placeholder="targeted / targeted_creature / aoe_enemy / self / summon / equip"
              value={form.spellTarget ?? ''}
              onChange={(e) => setForm({ ...form, spellTarget: e.target.value })}
            />
          </Field>

          <Field label="URL image (optionnel)">
            <input
              className="admin-input"
              value={form.imageUrl ?? ''}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </Field>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-6 w-full py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-lg uppercase tracking-widest text-sm hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{label}</span>
      {children}
    </label>
  )
}

// En-tête de colonne cliquable pour trier — réutilisé par les 3 tableaux admin.
function SortableTh<K extends string>({
  label, sortKey, activeKey, dir, onClick, className,
}: {
  label: string
  sortKey: K
  activeKey: K
  dir: 1 | -1
  onClick: (key: K) => void
  className?: string
}) {
  const active = sortKey === activeKey
  return (
    <th
      className={`cursor-pointer select-none hover:text-primary transition-colors ${className ?? ''}`}
      onClick={() => onClick(sortKey)}
    >
      {label} {active && (dir === 1 ? '▲' : '▼')}
    </th>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Joueurs
// ─────────────────────────────────────────────────────────────────────────

type PlayerSortKey = 'username' | 'eloScore' | 'role' | 'isBanned'

function PlayersPanel() {
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'All' | 'player' | 'admin'>('All')
  const [filterBanned, setFilterBanned] = useState<'All' | 'Actif' | 'Banni'>('All')
  const [sortKey, setSortKey] = useState<PlayerSortKey>('username')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const load = async () => {
    setLoading(true)
    try {
      setPlayers(await adminService.getPlayers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleBan = async (p: AdminPlayer) => {
    setError(null)
    try {
      await adminService.updatePlayer(p.id, { isBanned: !p.isBanned })
      await load()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Action impossible')
    }
  }

  const toggleRole = async (p: AdminPlayer) => {
    setError(null)
    try {
      await adminService.updatePlayer(p.id, { role: p.role === 'admin' ? 'player' : 'admin' })
      await load()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Action impossible')
    }
  }

  const editElo = async (p: AdminPlayer) => {
    const input = prompt(`Nouveau score ELO pour ${p.username}`, String(p.eloScore))
    if (input === null) return
    const elo = Number(input)
    if (Number.isNaN(elo)) return
    setError(null)
    try {
      await adminService.updatePlayer(p.id, { eloScore: elo })
      await load()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Action impossible')
    }
  }

  const handleSort = (key: PlayerSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else { setSortKey(key); setSortDir(1) }
  }

  const visiblePlayers = useMemo(() => {
    const filtered = players.filter((p) =>
      (filterRole === 'All' || p.role === filterRole) &&
      (filterBanned === 'All' || (filterBanned === 'Banni') === p.isBanned) &&
      (!search || p.username.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())),
    )
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === bv) return 0
      return (av > bv ? 1 : -1) * sortDir
    })
  }, [players, search, filterRole, filterBanned, sortKey, sortDir])

  return (
    <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-headline text-xl text-primary">Joueurs ({visiblePlayers.length}/{players.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="admin-input !w-auto" value={filterRole} onChange={(e) => setFilterRole(e.target.value as any)}>
            <option>All</option>
            <option value="player">player</option>
            <option value="admin">admin</option>
          </select>
          <select className="admin-input !w-auto" value={filterBanned} onChange={(e) => setFilterBanned(e.target.value as any)}>
            <option>All</option>
            <option>Actif</option>
            <option>Banni</option>
          </select>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
            <input
              className="admin-input !w-48 !pl-8"
              placeholder="Pseudo ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <p className="px-6 py-2 text-xs text-error bg-error/10">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
                <SortableTh label="Pseudo" sortKey="username" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-6 py-3" />
                <th className="px-4 py-3">Email</th>
                <SortableTh label="ELO" sortKey="eloScore" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <SortableTh label="Rôle" sortKey="role" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <SortableTh label="Statut" sortKey="isBanned" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {visiblePlayers.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-3 font-bold text-on-surface">{p.username}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.email}</td>
                  <td className="px-4 py-3 text-secondary font-bold">{p.eloScore}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      p.role === 'admin' ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-lowest text-on-surface-variant'
                    }`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      p.isBanned ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'
                    }`}>
                      {p.isBanned ? 'Banni' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right space-x-3">
                    <button onClick={() => editElo(p)} className="text-primary hover:underline text-xs font-bold uppercase">ELO</button>
                    <button onClick={() => toggleRole(p)} className="text-secondary hover:underline text-xs font-bold uppercase">
                      {p.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
                    </button>
                    <button onClick={() => toggleBan(p)} className="text-error hover:underline text-xs font-bold uppercase">
                      {p.isBanned ? 'Débannir' : 'Bannir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Parties
// ─────────────────────────────────────────────────────────────────────────

type GameSortKey = 'status' | 'startedAt' | 'player1'
const GAME_STATUS_FILTERS = ['All', 'waiting', 'in_progress', 'finished', 'abandoned'] as const

function GamesPanel() {
  const [games, setGames] = useState<AdminGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminGameDetail | null>(null)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<(typeof GAME_STATUS_FILTERS)[number]>('All')
  const [sortKey, setSortKey] = useState<GameSortKey>('startedAt')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  const load = async () => {
    setLoading(true)
    try {
      setGames(await adminService.getGames())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const viewDetail = async (id: string) => {
    setError(null)
    try {
      setDetail(await adminService.getGame(id))
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Impossible de charger la partie')
    }
  }

  const forceAbandon = async (id: string) => {
    if (!confirm('Forcer l\'abandon de cette partie ?')) return
    setError(null)
    try {
      await adminService.forceAbandonGame(id)
      await load()
      if (detail?.id === id) setDetail(null)
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Action impossible')
    }
  }

  const handleSort = (key: GameSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else { setSortKey(key); setSortDir(1) }
  }

  const visibleGames = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = games.filter((g) =>
      (filterStatus === 'All' || g.status === filterStatus) &&
      (!q || g.player1?.username.toLowerCase().includes(q) || g.player2?.username.toLowerCase().includes(q)),
    )
    const compare: Record<GameSortKey, (a: AdminGame, b: AdminGame) => number> = {
      status: (a, b) => a.status.localeCompare(b.status),
      startedAt: (a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''),
      player1: (a, b) => a.player1.username.localeCompare(b.player1.username),
    }
    return [...filtered].sort((a, b) => compare[sortKey](a, b) * sortDir)
  }, [games, search, filterStatus, sortKey, sortDir])

  return (
    <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-headline text-xl text-primary">Parties ({visibleGames.length}/{games.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="admin-input !w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            {GAME_STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
            <input
              className="admin-input !w-48 !pl-8"
              placeholder="Nom d'un joueur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <p className="px-6 py-2 text-xs text-error bg-error/10">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
                <SortableTh label="Joueur 1" sortKey="player1" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-6 py-3" />
                <th className="px-4 py-3">Joueur 2</th>
                <SortableTh label="Statut" sortKey="status" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <th className="px-4 py-3">Vainqueur</th>
                <SortableTh label="Débutée" sortKey="startedAt" activeKey={sortKey} dir={sortDir} onClick={handleSort} className="px-4 py-3" />
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {visibleGames.map((g) => (
                <tr key={g.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-3 font-bold text-on-surface">{g.player1?.username ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-on-surface">{g.player2?.username ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      g.status === 'in_progress' ? 'bg-secondary/20 text-secondary'
                        : g.status === 'finished' ? 'bg-primary/20 text-primary'
                        : g.status === 'abandoned' ? 'bg-error/20 text-error'
                        : 'bg-surface-container-lowest text-on-surface-variant'
                    }`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{g.winner?.username ?? '—'}</td>
                  <td className="px-4 py-3 text-[10px] text-on-surface-variant">
                    {g.startedAt ? new Date(g.startedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-3 text-right space-x-3">
                    <button onClick={() => viewDetail(g.id)} className="text-primary hover:underline text-xs font-bold uppercase">Détails</button>
                    {(g.status === 'waiting' || g.status === 'in_progress') && (
                      <button onClick={() => forceAbandon(g.id)} className="text-error hover:underline text-xs font-bold uppercase">
                        Forcer l'abandon
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div
            className="w-full max-w-2xl bg-surface-container-low rounded-xl border border-primary/20 shadow-2xl p-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-black text-primary uppercase tracking-widest">
                {detail.player1?.username} vs {detail.player2?.username}
              </h2>
              <button onClick={() => setDetail(null)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Statut : <span className="text-primary font-bold">{detail.status}</span>
              {detail.winner && <> — Vainqueur : <span className="text-primary font-bold">{detail.winner.username}</span></>}
            </p>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {detail.actions.length === 0 && (
                <p className="text-xs text-on-surface-variant italic">Aucune action enregistrée.</p>
              )}
              {detail.actions.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded bg-surface-container-lowest/50 text-xs">
                  <span className="text-on-surface-variant w-10">T{a.turnNumber}</span>
                  <span className="text-primary font-bold flex-1">{a.actionType}</span>
                  <span className="text-on-surface-variant text-[10px]">{new Date(a.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Journal d'audit
// ─────────────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  'card.create': 'Carte créée',
  'card.update': 'Carte modifiée',
  'card.delete': 'Carte supprimée',
  'player.role.change': 'Rôle modifié',
  'player.ban': 'Joueur banni',
  'player.unban': 'Joueur débanni',
  'player.elo.update': 'ELO modifié',
  'game.force_abandon': 'Partie forcée à l\'abandon',
}

function AuditPanel() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setEntries(await adminService.getAuditLog())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="bg-surface-container-highest rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
        <h3 className="font-headline text-xl text-primary">Journal d'audit ({entries.length})</h3>
        <button
          onClick={load}
          className="text-primary hover:underline text-xs font-bold uppercase"
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-12">Aucune action admin enregistrée pour l'instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
                <th className="px-6 py-3">Horodatage</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Cible</th>
                <th className="px-6 py-3">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-3 text-[10px] text-on-surface-variant whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-secondary">{e.actorUsername}</td>
                  <td className="px-4 py-3 text-primary font-bold">{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="px-4 py-3 text-[10px] text-on-surface-variant">
                    {e.targetType}:{e.targetId.slice(0, 8)}
                  </td>
                  <td className="px-6 py-3 text-[10px] text-on-surface-variant font-mono">
                    {e.metadata ? JSON.stringify(e.metadata) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
