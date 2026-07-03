import api from './api'
import type { Deck, Card } from '../store/deckStore'

interface BackendCard {
  id: string; name: string; cardType: string; manaCost: number
  attack?: number | null; defense?: number | null; effectText?: string | null
  rarity: string; imageUrl?: string | null; spellTarget?: string | null
}

interface BackendDeckCard { card: BackendCard; quantity: number }
interface BackendDeck {
  id: string; name: string; isValid: boolean; createdAt: string; updatedAt: string
  deckCards: BackendDeckCard[]
}

function mapCard(c: BackendCard): Card {
  return {
    id: c.id,
    name: c.name,
    cardType: c.cardType as Card['cardType'],
    manaCost: c.manaCost,
    attack: c.attack ?? undefined,
    defense: c.defense ?? undefined,
    effectText: c.effectText ?? undefined,
    rarity: c.rarity as Card['rarity'],
    imageUrl: c.imageUrl ?? undefined,
    spellTarget: c.spellTarget ?? undefined,
  }
}

function mapDeck(d: BackendDeck): Deck {
  return {
    id: d.id,
    name: d.name,
    isValid: d.isValid,
    createdAt: d.createdAt,
    cards: d.deckCards.map((dc) => ({ card: mapCard(dc.card), quantity: dc.quantity })),
  }
}

export const deckService = {
  async getMyDecks(): Promise<Deck[]> {
    const { data } = await api.get<BackendDeck[]>('/decks')
    return data.map(mapDeck)
  },

  async getDeck(id: string): Promise<Deck> {
    const { data } = await api.get<BackendDeck>(`/decks/${id}`)
    return mapDeck(data)
  },

  async createDeck(name: string): Promise<Deck> {
    const { data } = await api.post<BackendDeck>('/decks', { name })
    return mapDeck({ ...data, deckCards: [] })
  },

  async updateDeck(id: string, name: string): Promise<Deck> {
    const { data } = await api.patch<BackendDeck>(`/decks/${id}`, { name })
    return mapDeck(data)
  },

  async deleteDeck(id: string): Promise<void> {
    await api.delete(`/decks/${id}`)
  },

  async addCardToDeck(deckId: string, cardId: string, quantity = 1): Promise<void> {
    await api.post(`/decks/${deckId}/cards`, { cardId, quantity })
  },

  async removeCardFromDeck(deckId: string, cardId: string): Promise<void> {
    await api.delete(`/decks/${deckId}/cards/${cardId}`)
  },

  async getAllCards(): Promise<Card[]> {
    const { data } = await api.get<BackendCard[]>('/cards')
    return data.map(mapCard)
  },
}
