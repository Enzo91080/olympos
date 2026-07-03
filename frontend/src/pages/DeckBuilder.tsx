import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeckStore } from '../store/deckStore'
import type { Card } from '../store/deckStore'
import { useAuthStore } from '../store/authStore'
import { deckService } from '../services/deckService'
import OracleModal from '../components/OracleModal'

const ORACLE_UNLOCK_THRESHOLD = 10

const rarityColors: Record<string, string> = {
  common: 'bg-on-surface-variant/30',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-primary',
}

const STARTER_DECK_SIZE = 30

// Sélectionne 30 cartes équilibrées depuis toutes les cartes disponibles
function selectRecommendedCards(allCards: Card[]): { cardId: string; quantity: number }[] {
  const creatures = [...allCards.filter(c => c.cardType === 'creature')].sort((a, b) => a.manaCost - b.manaCost)
  const spells   = [...allCards.filter(c => c.cardType === 'spell')].sort((a, b) => a.manaCost - b.manaCost)
  const artifacts = [...allCards.filter(c => c.cardType === 'artifact')].sort((a, b) => a.manaCost - b.manaCost)

  const picks: { cardId: string; quantity: number }[] = []
  let total = 0

  const add = (card: Card, qty: number) => {
    if (total >= STARTER_DECK_SIZE) return
    if (total + qty > STARTER_DECK_SIZE) qty = STARTER_DECK_SIZE - total
    if (qty <= 0) return
    picks.push({ cardId: card.id, quantity: qty })
    total += qty
  }

  // Créatures peu coûteuses (1-2 mana), doublées
  creatures.filter(c => c.manaCost <= 2).forEach(c => add(c, 2))
  // Créatures intermédiaires (3-4 mana), doublées
  creatures.filter(c => c.manaCost > 2 && c.manaCost <= 4).forEach(c => add(c, 2))
  // Sorts, doublés
  spells.forEach(c => add(c, 2))
  // Artefacts, un exemplaire
  artifacts.forEach(c => add(c, 1))

  // Compléter jusqu'à 30 si besoin : créatures coûteuses puis second exemplaire des artefacts
  creatures.filter(c => c.manaCost > 4).forEach(c => add(c, 2))
  artifacts.forEach(c => {
    const existing = picks.find(p => p.cardId === c.id)
    if (existing && existing.quantity < 2) add(c, 1)
  })

  return picks
}

export default function DeckBuilder() {
  const navigate = useNavigate()
  const { player } = useAuthStore()
  const {
    decks, currentDeck, allCards, loading,
    selectDeck, createDeck, renameDeck, deleteDeck,
    addCardToDeck, removeCardFromDeck, loadDecksAndCards, refreshDeck,
  } = useDeckStore()

  useEffect(() => {
    loadDecksAndCards()
  }, [])

  const [filterMana, setFilterMana] = useState<number | null>(null)
  const [filterType, setFilterType] = useState('All Types')
  const [search, setSearch] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renamingValue, setRenamingValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [buildingStarter, setBuildingStarter] = useState(false)
  const [oracleOpen, setOracleOpen] = useState(false)

  const deckTotal = currentDeck?.cards.reduce((acc, dc) => acc + dc.quantity, 0) ?? 0
  const oracleUnlocked = deckTotal >= ORACLE_UNLOCK_THRESHOLD

  const filteredCards = allCards.filter((c) => {
    if (filterMana !== null && (filterMana === 5 ? c.manaCost >= 5 : c.manaCost !== filterMana)) return false
    if (filterType !== 'All Types' && c.cardType !== filterType.toLowerCase()) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAddCard = async (card: Card) => {
    if (!currentDeck) return
    const existing = currentDeck.cards.find((dc) => dc.card.id === card.id)
    if (existing && existing.quantity >= 2) return
    if (deckTotal >= 30) return
    try {
      await addCardToDeck(currentDeck.id, card)
    } catch {
      // état déjà resynchronisé avec le serveur par le store
    }
  }

  const handleRemoveCard = async (cardId: string) => {
    if (!currentDeck) return
    try {
      await removeCardFromDeck(currentDeck.id, cardId)
    } catch {
      // état déjà resynchronisé avec le serveur par le store
    }
  }

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    setSaving(true)
    await createDeck(newDeckName.trim())
    setNewDeckName('')
    setShowNewDeck(false)
    setSaving(false)
  }

  const handleRename = async () => {
    if (!currentDeck || !renamingValue.trim()) return
    setSaving(true)
    await renameDeck(currentDeck.id, renamingValue.trim())
    setRenaming(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!currentDeck) return
    if (!confirm(`Supprimer "${currentDeck.name}" ?`)) return
    await deleteDeck(currentDeck.id)
  }

  const handleCreateStarterDeck = async () => {
    if (allCards.length === 0) return
    setBuildingStarter(true)
    try {
      // Créer un nouveau deck
      const deck = await createDeck('Deck de démarrage')
      // Sélectionner 30 cartes équilibrées
      const picks = selectRecommendedCards(allCards)
      // Envoyer toutes les requêtes en parallèle
      await Promise.all(picks.map(p => deckService.addCardToDeck(deck.id, p.cardId, p.quantity)))
      // Recharger le deck depuis le serveur pour l'état final
      await refreshDeck(deck.id)
    } finally {
      setBuildingStarter(false)
    }
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      {/* TopAppBar */}
      <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-surface-container-lowest shadow-[0_4px_20px_rgba(51,34,111,0.08)] font-headline tracking-wider">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="text-primary-container hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-2xl font-bold uppercase tracking-tighter text-primary">Armurerie</span>

          {/* Deck selector */}
          <div className="flex items-center gap-2 ml-4">
            <select
              className="bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-primary"
              value={currentDeck?.id ?? ''}
              onChange={(e) => selectDeck(e.target.value)}
            >
              {decks.length === 0 && <option value="">Aucun deck</option>}
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.cards.reduce((a, dc) => a + dc.quantity, 0)}/30)</option>
              ))}
            </select>
            <button
              onClick={() => setShowNewDeck(true)}
              className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-fixed-dim transition-all"
            >
              + Nouveau
            </button>
            <button
              onClick={handleCreateStarterDeck}
              disabled={buildingStarter || allCards.length === 0}
              title="Crée automatiquement un deck de 30 cartes équilibré pour bien commencer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-on-secondary text-xs font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buildingStarter ? (
                <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Création...</>
              ) : (
                <><span className="material-symbols-outlined text-sm">auto_fix_high</span> Deck de démarrage</>
              )}
            </button>
            {currentDeck && (
              <>
                <button
                  onClick={() => { setRenaming(true); setRenamingValue(currentDeck.name) }}
                  className="p-1.5 text-primary-container hover:text-primary transition-colors"
                  title="Renommer"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-error/50 hover:text-error transition-colors"
                  title="Supprimer"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentDeck && oracleUnlocked && (
            <button
              onClick={() => setOracleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-secondary/30 bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/20 transition-all group"
            >
              <span className="material-symbols-outlined text-sm group-hover:animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Consulter l'Oracle
            </button>
          )}
          {currentDeck && (
            <div className={`flex items-center px-4 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest ${
              currentDeck.isValid
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-error/20 bg-error-container/10 text-error animate-pulse'
            }`}>
              <span className="material-symbols-outlined text-sm mr-2">
                {currentDeck.isValid ? 'check_circle' : 'error'}
              </span>
              {currentDeck.isValid ? 'Valide' : `${30 - deckTotal} cartes restantes`}
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary text-sm">person</span>
          </div>
        </div>
      </header>

      {/* New Deck Modal */}
      {showNewDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-low rounded-xl p-8 w-full max-w-sm border border-outline-variant/20 shadow-2xl">
            <h3 className="font-headline text-xl text-primary mb-6">Nouveau deck</h3>
            <input
              autoFocus
              className="w-full bg-surface-container-lowest border-0 rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 mb-4"
              placeholder="Nom du deck..."
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDeck()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateDeck}
                disabled={saving || !newDeckName.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold uppercase tracking-widest text-sm rounded-lg hover:shadow-[0_0_15px_rgba(230,195,100,0.4)] transition-all disabled:opacity-50"
              >
                {saving ? 'Création...' : 'Créer'}
              </button>
              <button onClick={() => setShowNewDeck(false)} className="px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-low rounded-xl p-8 w-full max-w-sm border border-outline-variant/20 shadow-2xl">
            <h3 className="font-headline text-xl text-primary mb-6">Renommer le deck</h3>
            <input
              autoFocus
              className="w-full bg-surface-container-lowest border-0 rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 mb-4"
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex gap-3">
              <button onClick={handleRename} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold uppercase tracking-widest text-sm rounded-lg transition-all disabled:opacity-50">
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button onClick={() => setRenaming(false)} className="px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-72px)]">
        {/* Deck Panel */}
        <section className="w-80 bg-surface-container-lowest flex flex-col shadow-xl border-r border-outline-variant/10 shrink-0">
          <div className="p-6 border-b border-outline-variant/20">
            <div className="flex justify-between items-end mb-3">
              <h2 className="font-headline text-xl text-primary">{currentDeck?.name ?? 'Sélectionner un deck'}</h2>
              <span className="text-sm font-bold text-on-surface-variant">{deckTotal} / 30</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary relative transition-all duration-500" style={{ width: `${(deckTotal / 30) * 100}%` }}>
                <div className="absolute right-0 top-0 h-full w-2 bg-white/40 blur-sm animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {loading && <p className="text-on-surface-variant text-sm text-center py-4">Chargement...</p>}
            {!currentDeck && !loading && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-primary-container text-4xl">style</span>
                <p className="text-sm text-on-surface-variant mt-2">Créez un deck pour commencer</p>
                <button onClick={() => setShowNewDeck(true)} className="mt-4 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg">
                  Nouveau deck
                </button>
              </div>
            )}
            {currentDeck?.cards.map((dc) => (
              <div
                key={dc.card.id}
                className="flex items-center justify-between p-3 rounded bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer border-l-2 border-primary"
                onClick={() => handleRemoveCard(dc.card.id)}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {dc.card.manaCost}
                  </span>
                  <span className="text-sm font-medium text-on-surface truncate">{dc.card.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-on-surface-variant">×{dc.quantity}</span>
                  <span className="material-symbols-outlined text-xs text-error opacity-0 group-hover:opacity-100 transition-opacity">remove_circle</span>
                </div>
              </div>
            ))}
            {currentDeck && deckTotal < 30 && (
              <div className="p-3 rounded border border-dashed border-outline-variant/30 flex items-center justify-center mt-2">
                <span className="text-[10px] uppercase tracking-widest text-outline">
                  {30 - deckTotal} carte{30 - deckTotal > 1 ? 's' : ''} manquante{30 - deckTotal > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Collection */}
        <section className="flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="p-5 bg-surface-container-low/50 backdrop-blur-md flex flex-wrap items-center gap-4 border-b border-outline-variant/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Mana</span>
              <div className="flex bg-surface-container-lowest rounded overflow-hidden">
                {[1, 2, 3, 4, 5].map((cost) => (
                  <button
                    key={cost}
                    onClick={() => setFilterMana(filterMana === cost ? null : cost)}
                    className={`px-3 py-1 text-xs border-r border-outline-variant/10 transition-colors ${filterMana === cost ? 'bg-primary text-on-primary font-bold' : 'hover:bg-primary/20 text-on-surface-variant'}`}
                  >
                    {cost === 5 ? '5+' : cost}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Type</span>
              <select
                className="bg-surface-container-lowest border-none text-xs rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-primary text-on-surface-variant"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All Types">Tous les types</option>
                <option value="Creature">Créature</option>
                <option value="Spell">Sort</option>
                <option value="Artifact">Artefact</option>
              </select>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="relative w-56">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-full py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary text-on-surface"
                  placeholder="Rechercher des cartes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-surface">
            {loading && (
              <div className="flex items-center justify-center h-40">
                <span className="material-symbols-outlined text-primary-container text-4xl animate-spin">autorenew</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredCards.map((card) => {
                const inDeck = currentDeck?.cards.find((dc) => dc.card.id === card.id)
                const maxed = inDeck && inDeck.quantity >= 2
                const deckFull = deckTotal >= 30

                return (
                  <div
                    key={card.id}
                    className={`relative group cursor-pointer aspect-[3/4.2] rounded-lg overflow-visible transition-all ${(maxed || deckFull || !currentDeck) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    onClick={() => !maxed && !deckFull && currentDeck && handleAddCard(card)}
                  >
                    {/* Tooltip au survol */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[100] w-56 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 shadow-2xl text-left">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2 ${
                          card.cardType === 'creature' ? 'bg-primary/20 text-primary' :
                          card.cardType === 'spell' ? 'bg-secondary/20 text-secondary' :
                          'bg-tertiary/20 text-tertiary'
                        }`}>
                          <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {card.cardType === 'creature' ? 'smart_toy' : card.cardType === 'spell' ? 'auto_fix_high' : 'shield'}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            {card.cardType === 'creature' ? 'Créature' : card.cardType === 'spell' ? 'Sort' : 'Artefact'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-primary mb-1">{card.name}</p>
                        {card.effectText
                          ? <p className="text-[11px] text-on-surface leading-snug">{card.effectText}</p>
                          : <p className="text-[11px] text-on-surface-variant italic">Aucun effet spécial.</p>
                        }
                        <div className="flex gap-3 mt-2 pt-2 border-t border-outline-variant/20">
                          <span className="text-[10px] text-secondary font-bold">💧 {card.manaCost} mana</span>
                          {card.attack !== undefined && <span className="text-[10px] text-primary font-bold">⚔ {card.attack}</span>}
                          {card.defense !== undefined && <span className="text-[10px] text-error font-bold">🛡 {card.defense}</span>}
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-surface-container-low border-r border-b border-outline-variant/30 rotate-45 mx-auto -mt-1"></div>
                    </div>
                    {(maxed) && (
                      <div className="absolute inset-0 bg-black/50 z-10 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-[10px] uppercase tracking-widest bg-black/60 px-3 py-1 rounded">Max</span>
                      </div>
                    )}
                    {inDeck && !maxed && (
                      <div className="absolute top-1 right-1 z-20 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-on-primary text-[9px] font-black">×{inDeck.quantity}</span>
                      </div>
                    )}
                    <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/50 via-primary to-primary-container opacity-0 group-hover:opacity-60 transition-opacity blur-sm rounded-xl"></div>
                    <div className="relative h-full bg-surface-container-highest rounded-lg overflow-hidden card-inner-glow">
                      {/* Art full-bleed */}
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
                      ) : (
                        <div className="absolute inset-0 bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary-container text-5xl opacity-30">
                            {card.cardType === 'creature' ? 'pets' : card.cardType === 'spell' ? 'auto_awesome' : 'diamond'}
                          </span>
                        </div>
                      )}
                      {/* Gradient overlay bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                      {/* Mana top-left */}
                      <div className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-secondary-container/80 backdrop-blur-sm flex items-center justify-center border border-primary/50">
                        <span className="font-headline font-bold text-primary text-xs">{card.manaCost}</span>
                      </div>
                      {/* Rarity gem top-right */}
                      <div className={`absolute top-2 right-2 w-3.5 h-3.5 rotate-45 ${rarityColors[card.rarity]} ${card.rarity === 'legendary' ? 'shadow-[0_0_8px_rgba(230,195,100,0.8)]' : ''}`} />
                      {/* Text bottom overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 flex flex-col gap-1">
                        <div className="text-center">
                          <h3 className="font-headline text-[11px] text-primary leading-tight drop-shadow-lg">{card.name}</h3>
                          <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full mt-0.5 ${
                            card.cardType === 'creature' ? 'bg-primary/30 text-primary' :
                            card.cardType === 'spell' ? 'bg-secondary/30 text-secondary' :
                            'bg-tertiary/30 text-tertiary'
                          }`}>
                            <span className="material-symbols-outlined text-[8px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {card.cardType === 'creature' ? 'smart_toy' : card.cardType === 'spell' ? 'auto_fix_high' : 'shield'}
                            </span>
                            <span className="text-[7px] font-bold uppercase tracking-widest">
                              {card.cardType === 'creature' ? 'Créature' : card.cardType === 'spell' ? 'Sort' : 'Artefact'}
                            </span>
                          </div>
                        </div>
                        {(card.attack !== undefined || card.defense !== undefined) && (
                          <div className="flex justify-between items-center mt-0.5">
                            {card.attack !== undefined ? (
                              <div className="w-6 h-6 rounded bg-black/60 backdrop-blur-sm flex items-center justify-center border border-primary/40">
                                <span className="font-headline text-primary font-bold text-[10px]">{card.attack}</span>
                              </div>
                            ) : <div />}
                            {card.defense !== undefined ? (
                              <div className="w-6 h-6 rounded bg-black/60 backdrop-blur-sm flex items-center justify-center border border-error/40">
                                <span className="font-headline text-error font-bold text-[10px]">{card.defense}</span>
                              </div>
                            ) : <div />}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {oracleOpen && <OracleModal onClose={() => setOracleOpen(false)} />}
    </div>
  )
}
