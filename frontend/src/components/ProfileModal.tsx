import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { player, updatePlayer } = useAuthStore()
  const [username, setUsername] = useState(player?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(player?.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!username.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const updated = await authService.updateProfile({
        username: username.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      })
      updatePlayer(updated)
      onClose()
    } catch (e: any) {
      setError(
        e?.response?.status === 409 || e?.response?.data?.message?.includes?.('unique')
          ? 'Ce nom de joueur est déjà pris.'
          : e?.response?.data?.message ?? 'Impossible de mettre à jour le profil.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-primary/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-xl font-bold uppercase tracking-wider text-primary">
            Mon profil
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-primary-container hover:bg-surface-container-low rounded-full transition-all"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-surface-container-highest border border-primary/20 overflow-hidden flex items-center justify-center">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            ) : (
              <span className="material-symbols-outlined text-primary text-4xl">person</span>
            )}
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-sm font-medium text-surface-variant">Nom de joueur</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={50}
            className="mt-1 w-full rounded-lg border border-primary/20 bg-surface-container-low px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium text-surface-variant">URL de l'avatar (optionnel)</span>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-primary/20 bg-surface-container-low px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-surface-variant hover:bg-surface-container-low transition-all"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !username.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
