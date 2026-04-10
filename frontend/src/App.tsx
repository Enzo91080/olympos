import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useDeckStore } from './store/deckStore'
import { useStatsStore } from './store/statsStore'

function AppInit() {
  const { isAuthenticated, player } = useAuthStore()
  const { loadDecksAndCards } = useDeckStore()
  const { loadHistory } = useStatsStore()

  useEffect(() => {
    if (isAuthenticated && player) {
      loadDecksAndCards()
      loadHistory(player.id)
    }
  }, [isAuthenticated, player?.id])

  return <RouterProvider router={router} />
}

export default function App() {
  return <AppInit />
}
