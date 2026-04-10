import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import DeckBuilder from '../pages/DeckBuilder'
import GameBoard from '../pages/GameBoard'
import Leaderboard from '../pages/Leaderboard'
import History from '../pages/History'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/deck-builder',
    element: (
      <ProtectedRoute>
        <DeckBuilder />
      </ProtectedRoute>
    ),
  },
  {
    path: '/deck-builder/:deckId',
    element: (
      <ProtectedRoute>
        <DeckBuilder />
      </ProtectedRoute>
    ),
  },
  {
    path: '/game/:gameId',
    element: (
      <ProtectedRoute>
        <GameBoard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/leaderboard',
    element: (
      <ProtectedRoute>
        <Leaderboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/history',
    element: (
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
