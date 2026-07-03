import { create } from 'zustand'
import { deckService } from '../services/deckService'

export interface Card {
  id: string
  name: string
  cardType: 'creature' | 'spell' | 'artifact'
  manaCost: number
  attack?: number
  defense?: number
  effectText?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  imageUrl?: string
  spellTarget?: string
}

export interface DeckCard {
  card: Card
  quantity: number
}

export interface Deck {
  id: string
  name: string
  cards: DeckCard[]
  isValid: boolean
  createdAt: string
}

interface DeckState {
  decks: Deck[]
  currentDeck: Deck | null
  allCards: Card[]
  loading: boolean
  error: string | null

  loadDecksAndCards: () => Promise<void>
  selectDeck: (deckId: string) => void
  createDeck: (name: string) => Promise<Deck>
  renameDeck: (deckId: string, name: string) => Promise<void>
  deleteDeck: (deckId: string) => Promise<void>
  addCardToDeck: (deckId: string, card: Card) => Promise<void>
  removeCardFromDeck: (deckId: string, cardId: string) => Promise<void>
  refreshDeck: (deckId: string) => Promise<void>
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  currentDeck: null,
  allCards: [],
  loading: false,
  error: null,

  loadDecksAndCards: async () => {
    set({ loading: true, error: null })
    try {
      const [decks, cards] = await Promise.all([
        deckService.getMyDecks(),
        deckService.getAllCards(),
      ])
      set((s) => {
        // Conserve le deck actuellement sélectionné s'il existe toujours,
        // au lieu de retomber systématiquement sur le plus récent.
        const preserved = s.currentDeck
          ? decks.find((d) => d.id === s.currentDeck!.id)
          : undefined
        return {
          decks,
          allCards: cards,
          currentDeck: preserved ?? decks[0] ?? null,
          loading: false,
        }
      })
    } catch (e: any) {
      set({ loading: false, error: e.message })
    }
  },

  selectDeck: (deckId) => {
    const deck = get().decks.find((d) => d.id === deckId) ?? null
    set({ currentDeck: deck })
  },

  createDeck: async (name) => {
    const deck = await deckService.createDeck(name)
    set((s) => ({ decks: [deck, ...s.decks], currentDeck: deck }))
    return deck
  },

  renameDeck: async (deckId, name) => {
    await deckService.updateDeck(deckId, name)
    set((s) => ({
      decks: s.decks.map((d) => d.id === deckId ? { ...d, name } : d),
      currentDeck: s.currentDeck?.id === deckId ? { ...s.currentDeck, name } : s.currentDeck,
    }))
  },

  deleteDeck: async (deckId) => {
    await deckService.deleteDeck(deckId)
    set((s) => {
      const decks = s.decks.filter((d) => d.id !== deckId)
      return { decks, currentDeck: s.currentDeck?.id === deckId ? (decks[0] ?? null) : s.currentDeck }
    })
  },

  addCardToDeck: async (deckId, card) => {
    // Optimistic update
    set((s) => ({
      decks: s.decks.map((d) => {
        if (d.id !== deckId) return d
        const existing = d.cards.find((dc) => dc.card.id === card.id)
        if (existing && existing.quantity >= 2) return d
        const cards = existing
          ? d.cards.map((dc) => dc.card.id === card.id ? { ...dc, quantity: dc.quantity + 1 } : dc)
          : [...d.cards, { card, quantity: 1 }]
        const total = cards.reduce((acc, dc) => acc + dc.quantity, 0)
        return { ...d, cards, isValid: total === 30 }
      }),
      currentDeck: (() => {
        const d = s.currentDeck
        if (!d || d.id !== deckId) return s.currentDeck
        const existing = d.cards.find((dc) => dc.card.id === card.id)
        if (existing && existing.quantity >= 2) return d
        const cards = existing
          ? d.cards.map((dc) => dc.card.id === card.id ? { ...dc, quantity: dc.quantity + 1 } : dc)
          : [...d.cards, { card, quantity: 1 }]
        const total = cards.reduce((acc, dc) => acc + dc.quantity, 0)
        return { ...d, cards, isValid: total === 30 }
      })(),
    }))
    // Persist to backend ; si le serveur refuse (ex: cap 30 atteint), on resynchronise l'état réel
    try {
      await deckService.addCardToDeck(deckId, card.id)
    } catch (e) {
      await get().refreshDeck(deckId)
      throw e
    }
  },

  removeCardFromDeck: async (deckId, cardId) => {
    // Optimistic update
    set((s) => ({
      decks: s.decks.map((d) => {
        if (d.id !== deckId) return d
        const cards = d.cards
          .map((dc) => dc.card.id === cardId ? { ...dc, quantity: dc.quantity - 1 } : dc)
          .filter((dc) => dc.quantity > 0)
        const total = cards.reduce((acc, dc) => acc + dc.quantity, 0)
        return { ...d, cards, isValid: total === 30 }
      }),
      currentDeck: (() => {
        const d = s.currentDeck
        if (!d || d.id !== deckId) return s.currentDeck
        const cards = d.cards
          .map((dc) => dc.card.id === cardId ? { ...dc, quantity: dc.quantity - 1 } : dc)
          .filter((dc) => dc.quantity > 0)
        const total = cards.reduce((acc, dc) => acc + dc.quantity, 0)
        return { ...d, cards, isValid: total === 30 }
      })(),
    }))
    try {
      await deckService.removeCardFromDeck(deckId, cardId)
    } catch (e) {
      await get().refreshDeck(deckId)
      throw e
    }
  },

  refreshDeck: async (deckId) => {
    const deck = await deckService.getDeck(deckId)
    set((s) => ({
      decks: s.decks.map((d) => d.id === deckId ? deck : d),
      currentDeck: s.currentDeck?.id === deckId ? deck : s.currentDeck,
    }))
  },
}))
