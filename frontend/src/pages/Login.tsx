import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let res
      if (mode === 'login') {
        res = await authService.login({ email, password })
      } else {
        res = await authService.register({ username, email, password })
      }
      login(res.player, res.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid credentials. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body min-h-screen flex items-center justify-center overflow-hidden lightning-bg selection:bg-primary-container selection:text-on-primary">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-5 left-5 w-32 h-32 opacity-40">
          <span className="material-symbols-outlined text-primary text-8xl">architecture</span>
        </div>
        <div className="absolute top-5 right-5 w-32 h-32 opacity-40" style={{ transform: 'scaleX(-1)' }}>
          <span className="material-symbols-outlined text-primary text-8xl">architecture</span>
        </div>
        <div className="absolute bottom-5 left-5 w-32 h-32 opacity-40" style={{ transform: 'scaleY(-1)' }}>
          <span className="material-symbols-outlined text-primary text-8xl">architecture</span>
        </div>
        <div className="absolute bottom-5 right-5 w-32 h-32 opacity-40" style={{ transform: 'scale(-1)' }}>
          <span className="material-symbols-outlined text-primary text-8xl">architecture</span>
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-10 blur-[120px] bg-secondary-container rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 opacity-5 bg-primary-fixed rounded-full blur-[100px]"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center">
        {/* Logo */}
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
              <span className="font-headline text-xl tracking-[0.3em] text-on-surface-variant font-bold uppercase">Card Clash</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary"></div>
            </div>
          </div>
        </div>

        {/* Auth Container */}
        <div className="w-full bg-surface-container-low/80 backdrop-blur-xl rounded-lg p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/10 relative overflow-hidden">
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant ml-1">
                  Chosen Name (Username)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">person</span>
                  <input
                    className="w-full bg-surface-container-lowest border-0 rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 transition-all font-body ichor-glow"
                    placeholder="Olympian Warrior"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant ml-1">
                The Messenger's Handle (Email)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">alternate_email</span>
                <input
                  className="w-full bg-surface-container-lowest border-0 rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 transition-all font-body ichor-glow"
                  placeholder="zeus@olympos.god"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">
                  The Secret Cipher
                </label>
                {mode === 'login' && (
                  <a className="text-[10px] uppercase tracking-wider text-primary/70 hover:text-primary transition-colors" href="#">
                    Forgotten Ritual?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">lock</span>
                <input
                  className="w-full bg-surface-container-lowest border-0 rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/50 transition-all font-body ichor-glow"
                  placeholder="••••••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                  {loading ? 'Entering...' : mode === 'login' ? 'Enter Olympos' : 'Join Olympos'}
                </span>
                <span className="material-symbols-outlined text-on-primary text-xl group-hover/btn:translate-x-1 transition-transform">
                  arrow_forward_ios
                </span>
              </div>
              <div className="absolute inset-0 border border-primary-fixed/30 rounded-lg pointer-events-none"></div>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-outline-variant/10 text-center relative z-10">
            <p className="text-sm text-on-surface-variant mb-4">
              {mode === 'login' ? 'New to the Divine Arena?' : 'Already a Divine Warrior?'}
            </p>
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-primary hover:text-primary-fixed transition-colors"
            >
              <span>{mode === 'login' ? 'Switch to Register' : 'Switch to Login'}</span>
              <span className="material-symbols-outlined text-base">
                {mode === 'login' ? 'person_add' : 'login'}
              </span>
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-12 flex flex-col items-center space-y-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <span className="font-headline text-2xl font-bold text-on-surface">12k+</span>
              <span className="text-[10px] uppercase tracking-tighter text-outline font-bold">Divine Warriors</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/30"></div>
            <div className="flex flex-col items-center">
              <span className="font-headline text-2xl font-bold text-on-surface">400+</span>
              <span className="text-[10px] uppercase tracking-tighter text-outline font-bold">Relic Cards</span>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-outline text-center leading-loose">
            Property of Olympos Interactive • Sealed by the Oracle • Ver. 2.4.0
          </p>
        </div>
      </main>

      {/* Decorative cards */}
      <div className="fixed bottom-[-50px] -left-20 rotate-12 opacity-10 hidden lg:block">
        <div className="w-64 h-96 bg-surface-container-highest rounded-xl border-4 border-primary/20 shadow-2xl"></div>
      </div>
      <div className="fixed bottom-[-80px] -right-20 -rotate-12 opacity-10 hidden lg:block">
        <div className="w-64 h-96 bg-surface-container-highest rounded-xl border-4 border-primary/20 shadow-2xl"></div>
      </div>
    </div>
  )
}
