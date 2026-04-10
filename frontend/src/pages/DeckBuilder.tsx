import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeckStore } from '../store/deckStore'
import type { Card } from '../store/deckStore'
import { useAuthStore } from '../store/authStore'

const rarityColors: Record<string, string> = {
  common: 'bg-on-surface-variant/30',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-primary',
}

export default function DeckBuilder() {
  const navigate = useNavigate()
  const { player } = useAuthStore()
  const {
    decks, currentDeck, allCards, loading,
    selectDeck, createDeck, renameDeck, deleteDeck,
    addCardToDeck, removeCardFromDeck,
  } = useDeckStore()

  const [filterMana, setFilterMana] = useState<number | null>(null)
  const [filterType, setFilterType] = useState('All Types')
  const [search, setSearch] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renamingValue, setRenamingValue] = useState('')
  const [saving, setSaving] = useState(false)

  const deckTotal = currentDeck?.cards.reduce((acc, dc) => acc + dc.quantity, 0) ?? 0

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
    await addCardToDeck(currentDeck.id, card)
  }

  const handleRemoveCard = async (cardId: string) => {
    if (!currentDeck) return
    await removeCardFromDeck(currentDeck.id, cardId)
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
    if (!confirm(`Delete "${currentDeck.name}"?`)) return
    await deleteDeck(currentDeck.id)
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      {/* TopAppBar */}
      <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-surface-container-lowest shadow-[0_4px_20px_rgba(51,34,111,0.08)] font-headline tracking-wider">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="text-primary-container hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-2xl font-bold uppercase tracking-tighter text-primary">Armory</span>

          {/* Deck selector */}
          <div className="flex items-center gap-2 ml-4">
            <select
              className="bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-primary"
              value={currentDeck?.id ?? ''}
              onChange={(e) => selectDeck(e.target.value)}
            >
              {decks.length === 0 && <option value="">No decks</option>}
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.cards.reduce((a, dc) => a + dc.quantity, 0)}/30)</option>
              ))}
            </select>
            <button
              onClick={() => setShowNewDeck(true)}
              className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-fixed-dim transition-all"
            >
              + New
            </button>
            {currentDeck && (
              <>
                <button
                  onClick={() => { setRenaming(true); setRenamingValue(currentDeck.name) }}
                  className="p-1.5 text-primary-container hover:text-primary transition-colors"
                  title="Rename"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-error/50 hover:text-error transition-colors"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentDeck && (
            <div className={`flex items-center px-4 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest ${
              currentDeck.isValid
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-error/20 bg-error-container/10 text-error animate-pulse'
            }`}>
              <span className="material-symbols-outlined text-sm mr-2">
                {currentDeck.isValid ? 'check_circle' : 'error'}
              </span>
              {currentDeck.isValid ? 'Valid' : `${30 - deckTotal} cards remaining`}
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
            <h3 className="font-headline text-xl text-primary mb-6">New Deck</h3>
            <input
              autoFocus
              className="w-full bg-surface-container-lowest border-0 rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 mb-4"
              placeholder="Deck name..."
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
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setShowNewDeck(false)} className="px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-low rounded-xl p-8 w-full max-w-sm border border-outline-variant/20 shadow-2xl">
            <h3 className="font-headline text-xl text-primary mb-6">Rename Deck</h3>
            <input
              autoFocus
              className="w-full bg-surface-container-lowest border-0 rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 mb-4"
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex gap-3">
              <button onClick={handleRename} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold uppercase tracking-widest text-sm rounded-lg transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setRenaming(false)} className="px-4 py-2.5 border border-outline-variant/30 text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-all">
                Cancel
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
              <h2 className="font-headline text-xl text-primary">{currentDeck?.name ?? 'Select a deck'}</h2>
              <span className="text-sm font-bold text-on-surface-variant">{deckTotal} / 30</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary relative transition-all duration-500" style={{ width: `${(deckTotal / 30) * 100}%` }}>
                <div className="absolute right-0 top-0 h-full w-2 bg-white/40 blur-sm animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {loading && <p className="text-on-surface-variant text-sm text-center py-4">Loading...</p>}
            {!currentDeck && !loading && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-primary-container text-4xl">style</span>
                <p className="text-sm text-on-surface-variant mt-2">Create a deck to start</p>
                <button onClick={() => setShowNewDeck(true)} className="mt-4 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg">
                  New Deck
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
                  {30 - deckTotal} more card{30 - deckTotal > 1 ? 's' : ''} needed
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
                <option>All Types</option>
                <option>Creature</option>
                <option>Spell</option>
                <option>Artifact</option>
              </select>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="relative w-56">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-full py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary text-on-surface"
                  placeholder="Search cards..."
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
                    <div className="relative h-full bg-surface-container-highest rounded-lg overflow-hidden flex flex-col card-inner-glow">
                      <div className="relative h-[52%] w-full bg-surface-container-high flex items-center justify-center">
                        {card.imageUrl ? (
                          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary-container text-5xl opacity-30">
                            {card.cardType === 'creature' ? 'pets' : card.cardType === 'spell' ? 'auto_awesome' : 'diamond'}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest to-transparent"></div>
                        <div className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-secondary-container glass-panel flex items-center justify-center border border-primary/40">
                          <span className="font-headline font-bold text-primary text-xs">{card.manaCost}</span>
                        </div>
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div className="text-center">
                          <h3 className="font-headline text-sm text-primary leading-tight">{card.name}</h3>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-[0.15em] mt-0.5">{card.rarity} {card.cardType}</p>
                        </div>
                        {card.effectText && (
                          <p className="text-[9px] text-on-surface/60 text-center italic leading-relaxed px-1 mt-1 line-clamp-2">
                            "{card.effectText}"
                          </p>
                        )}
                        <div className="flex justify-between items-end mt-1">
                          {card.attack !== undefined ? (
                            <div className="w-7 h-7 rounded bg-surface-container-low flex items-center justify-center border border-outline-variant/30">
                              <span className="font-headline text-primary font-bold text-xs">{card.attack}</span>
                            </div>
                          ) : <div />}
                          <div className={`w-4 h-4 rotate-45 ${rarityColors[card.rarity]} ${card.rarity === 'legendary' ? 'shadow-[0_0_8px_rgba(230,195,100,0.6)]' : ''}`}></div>
                          {card.defense !== undefined ? (
                            <div className="w-7 h-7 rounded bg-surface-container-low flex items-center justify-center border border-outline-variant/30">
                              <span className="font-headline text-error font-bold text-xs">{card.defense}</span>
                            </div>
                          ) : <div />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
