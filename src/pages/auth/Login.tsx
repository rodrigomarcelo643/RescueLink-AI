import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, signInWithFacebook } from '@/services/auth.service'
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

  const handleFacebook = async () => {
    const { data } = await signInWithFacebook()
    if (!data?.url) return
    const w = 500, h = 600
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    window.open(data.url, 'fb-login', `width=${w},height=${h},left=${left},top=${top}`)
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
                  onClick={handleFacebook}
                  className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#1877f2', borderRadius: 5 }}
                >
                  <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                  </svg>
                  Sign in with Facebook
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
