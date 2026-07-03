import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/authService'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true })
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authService.resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired link. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body min-h-screen flex items-center justify-center overflow-hidden selection:bg-primary-container selection:text-on-primary">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-5 left-5 w-32 h-32 opacity-40">
          <span className="material-symbols-outlined text-primary text-8xl">architecture</span>
        </div>
        <div className="absolute top-5 right-5 w-32 h-32 opacity-40" style={{ transform: 'scaleX(-1)' }}>
          <span className="material-symbols-outlined text-primary text-8xl">architecture</span>
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-10 blur-[120px] bg-secondary-container rounded-full"></div>
      </div>

      <main className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
        <div className="text-center mb-12">
          <div className="inline-block relative">
            <span
              className="material-symbols-outlined text-primary text-7xl absolute -top-12 left-1/2 -translate-x-1/2 opacity-80"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >bolt</span>
            <h1 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(230,195,100,0.4)]">
              Olympos
            </h1>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary"></div>
              <span className="font-headline text-xl tracking-[0.3em] text-on-surface-variant font-bold uppercase">New Cipher</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary"></div>
            </div>
          </div>
        </div>

        <div className="w-full bg-surface-container-low/80 backdrop-blur-xl rounded-lg p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/10 relative overflow-hidden">
          {success ? (
            <div className="text-center space-y-6 relative z-10">
              <span
                className="material-symbols-outlined text-primary text-6xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >check_circle</span>
              <p className="text-on-surface font-body text-base">
                Password updated. Redirecting to login...
              </p>
            </div>
          ) : (
            <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Choose a new secret cipher to protect your divine account.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant ml-1">
                  New Secret Cipher
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">lock</span>
                  <input
                    className="w-full bg-surface-container-lowest border-0 rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 transition-all font-body"
                    placeholder="••••••••••••"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant ml-1">
                  Confirm New Cipher
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">lock_reset</span>
                  <input
                    className="w-full bg-surface-container-lowest border-0 rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 transition-all font-body"
                    placeholder="••••••••••••"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <p className="text-error text-sm text-center">{error}</p>
              )}

              <button className="w-full relative group/btn mt-4 overflow-hidden rounded-lg" type="submit" disabled={loading}>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-container group-hover/btn:scale-105 transition-transform duration-500"></div>
                <div className="relative py-5 px-8 flex items-center justify-center gap-3">
                  <span className="font-headline text-lg font-black uppercase tracking-widest text-on-primary">
                    {loading ? 'Updating...' : 'Set New Password'}
                  </span>
                  <span className="material-symbols-outlined text-on-primary text-xl group-hover/btn:translate-x-1 transition-transform">
                    arrow_forward_ios
                  </span>
                </div>
                <div className="absolute inset-0 border border-primary-fixed/30 rounded-lg pointer-events-none"></div>
              </button>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-outline-variant/10 text-center relative z-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-primary hover:text-primary-fixed transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
