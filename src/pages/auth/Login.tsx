import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, signInWithGoogle } from '@/services/auth.service'
import { signInAgency } from '@/services/agencyAuth.service'
import { useAuth } from '@/context/AuthContext'
import { AlertTriangle, Lock, Eye, EyeOff, User } from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FadeUp, FadeIn } from '@/components/shared/MotionWrappers'

const ease = [0.22, 1, 0.36, 1] as const

const STATS = [
  { n: '24/7', d: 'Monitoring' },
  { n: '3+',   d: 'Channels'  },
  { n: 'AI',   d: 'Powered'   },
]

export default function Login() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    try {
      const { error: googleErr } = await signInWithGoogle()
      if (googleErr) {
        setError(googleErr.message)
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign in failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1) RBAC Check: Try Response Agency Credentials first
    const { agency, error: agencyErr } = await signInAgency(emailOrUsername, password)
    if (agency) {
      await refreshProfile()
      navigate('/agency-dashboard', { replace: true })
      setLoading(false)
      return
    }

    if (agencyErr && agencyErr.includes('Incorrect password')) {
      setError(agencyErr)
      setLoading(false)
      return
    }

    // 2) Standard Supabase Auth Check (LGU, Citizen, Admin)
    const { error: authErr } = await signIn(emailOrUsername, password)
    if (authErr) {
      setError(authErr.message)
    } else {
      await refreshProfile()
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* ── Left panel ── */}
      <motion.div
        className="relative hidden w-[48%] flex-col items-center justify-center gap-8 bg-white p-16 lg:flex"
        style={{ borderRight: '1px solid #f0f0f0' }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <motion.img
          src={mainLogo}
          alt="RescueLink AI"
          className="w-64 object-contain"
          style={{ borderRadius: 12 }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
        />

        <FadeUp delay={0.25} className="text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">RescueLink AI</h1>
          <p className="mt-1 text-sm font-medium text-gray-400">Rescue & Relief Coordination Platform</p>
        </FadeUp>

        <FadeUp
          delay={0.35}
          className="flex w-full max-w-xs divide-x divide-gray-100 overflow-hidden"
          style={{ border: '1px solid #f0f0f0', borderRadius: 5 }}
        >
          {STATS.map(({ n, d }, i) => (
            <motion.div
              key={d}
              className="flex flex-1 flex-col items-center py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08, ease: 'easeOut' }}
            >
              <span className="text-base font-extrabold text-gray-900">{n}</span>
              <span className="text-[11px] font-medium text-gray-400">{d}</span>
            </motion.div>
          ))}
        </FadeUp>

        <FadeIn delay={0.6} className="absolute bottom-8">
          <p className="text-[11px] text-gray-300">
            © {new Date().getFullYear()} RescueLink AI · Philippines
          </p>
        </FadeIn>
      </motion.div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-[500px]">

          {/* Mobile logo */}
          <motion.div
            className="mb-8 flex flex-col items-center gap-3 lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <img src={mainLogo} alt="RescueLink AI" className="w-28 object-contain" style={{ borderRadius: 8 }} />
          </motion.div>

          {/* Heading */}
          <FadeUp delay={0.1} className="mb-7 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-gray-400">Sign in to your account to continue</p>
          </FadeUp>

          {/* Form card */}
          <motion.div
            className="bg-white p-6"
            style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <FadeUp delay={0.26}>
                <Input
                  label="Email or Agency Username *"
                  type="text"
                  placeholder="you@rescuelink.ph or bfp_labangon"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  icon={<User size={14} />}
                  required
                />
              </FadeUp>

              <FadeUp delay={0.32}>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={14} />}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="transition-colors hover:text-gray-500"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                  required
                />
              </FadeUp>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-start gap-2 px-3 py-2.5"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5 }}
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <AlertTriangle size={13} className="mt-px shrink-0 text-red-600" />
                    <p className="text-[12px] font-semibold text-red-600">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <FadeUp delay={0.38}>
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </FadeUp>

              <FadeUp delay={0.40}>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ background: '#e5e7eb' }} />
                  <span className="text-[11px] text-gray-400">or</span>
                  <div className="h-px flex-1" style={{ background: '#e5e7eb' }} />
                </div>
              </FadeUp>

              <FadeUp delay={0.41}>
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex w-full items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-extrabold text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </FadeUp>

              <FadeUp delay={0.42} className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-[12px] font-semibold text-gray-400 underline underline-offset-4 transition-colors hover:text-red-700"
                >
                  Forgot password?
                </Link>
              </FadeUp>

            </form>
          </motion.div>

        </div>
      </div>

    </div>
  )
}
