import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/services/supabase'
import { signIn, signInWithGoogle } from '@/services/auth.service'
import { signInAgency } from '@/services/agencyAuth.service'
import { useAuth } from '@/context/AuthContext'
import { AlertTriangle, Lock, Eye, EyeOff, User } from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import loginBg from '@/assets/images/login_bg.jpg'
import { Button } from '@/components/ui/button'
import { FadeUp, FadeIn } from '@/components/shared/MotionWrappers'

const ease = [0.22, 1, 0.36, 1] as const

const STATS = [
  { n: 'AI',   d: 'Predictive' },
  { n: '100%', d: 'Unified'    },
  { n: '24/7', d: 'Response'   },
]

function FloatingBottomBorderInput({
  label,
  type = 'text',
  value,
  onChange,
  icon,
  endAdornment,
  required,
}: {
  label: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: React.ReactNode
  endAdornment?: React.ReactNode
  required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const isFloating = focused || value.length > 0

  return (
    <div className="relative pt-4">
      <div
        className={`flex items-center gap-2.5 pb-1.5 border-b-2 transition-colors ${
          focused ? 'border-red-700' : 'border-gray-200'
        }`}
      >
        {icon && (
          <span className={`shrink-0 transition-colors ${focused ? 'text-red-700' : 'text-gray-400'}`}>
            {icon}
          </span>
        )}
        <div className="relative flex-1">
          <label
            className={`absolute left-0 transition-all duration-200 pointer-events-none ${
              isFloating
                ? '-top-4 text-[11px] font-black uppercase tracking-wider text-red-700'
                : 'top-0 text-sm font-semibold text-gray-400'
            }`}
          >
            {label}
          </label>
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            required={required}
            className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
          />
        </div>
        {endAdornment && <span className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">{endAdornment}</span>}
      </div>
    </div>
  )
}

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

    // 2) Standard Supabase Auth Check (LGU, Volunteer, Citizen, Admin)
    const { error: authErr } = await signIn(emailOrUsername, password)
    if (authErr) {
      setError(authErr.message)
      setLoading(false)
      return
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    let detectedRole = currentUser?.user_metadata?.role || 'lgu'

    if (currentUser?.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle()
      if (prof?.role) detectedRole = prof.role
    }

    await refreshProfile()

    if (detectedRole === 'volunteer') {
      navigate('/volunteer-dashboard', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">

      {/* ── Left panel with login_bg.jpg ── */}
      <motion.div
        className="relative hidden w-[48%] flex-col items-center justify-between bg-cover bg-center bg-no-repeat p-12 lg:flex overflow-hidden"
        style={{ backgroundImage: `url(${loginBg})` }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

        <div className="relative z-10 flex w-full flex-col items-center gap-6 text-center my-auto">
          <FadeUp delay={0.25} className="text-center max-w-sm">
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">RescueLink AI</h1>
            <p className="mt-1.5 text-xs font-black uppercase tracking-wider text-red-400 drop-shadow">
              AI-Powered Disaster Intelligence & Response System
            </p>
            <p className="mt-2 text-xs font-medium text-slate-200 leading-relaxed drop-shadow bg-black/40 p-3 rounded-xl border border-white/10">
              Predicting impact, prioritizing response, and coordinating emergency action before lives are at risk.
            </p>
          </FadeUp>

          <FadeUp
            delay={0.35}
            className="flex w-full max-w-xs divide-x divide-white/10 overflow-hidden bg-black/40 backdrop-blur-md"
            style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10 }}
          >
            {STATS.map(({ n, d }, i) => (
              <motion.div
                key={d}
                className="flex flex-1 flex-col items-center py-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.08, ease: 'easeOut' }}
              >
                <span className="text-base font-extrabold text-white">{n}</span>
                <span className="text-[11px] font-medium text-slate-300">{d}</span>
              </motion.div>
            ))}
          </FadeUp>
        </div>

        <FadeIn delay={0.6} className="relative z-10">
          <p className="text-[11px] text-slate-300 font-medium drop-shadow-sm">
            © {new Date().getFullYear()} RescueLink AI · Philippines
          </p>
        </FadeIn>
      </motion.div>

      {/* ── Right panel (Fully Responsive & Wider Form) ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-4 sm:px-8 py-8 sm:py-16">
        <div className="w-full max-w-[560px]">

          {/* Form card */}
          <motion.div
            className="bg-white p-7 sm:p-9 shadow-xs"
            style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
          >
            {/* Header inspired by user screenshot: Title on left, Logo badge on right */}
            <div className="flex items-start justify-between gap-4 mb-7 pb-2 border-b border-gray-100">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Sign in</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500">to continue to RescueLink AI</p>
              </div>
              <img
                src={mainLogo}
                alt="RescueLink AI"
                className="h-10 sm:h-12 w-auto object-contain rounded-lg border border-gray-200 shadow-2xs shrink-0"
              />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              <FadeUp delay={0.26}>
                <FloatingBottomBorderInput
                  label="Username"
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  icon={<User size={16} />}
                  required
                />
              </FadeUp>

              <FadeUp delay={0.32}>
                <FloatingBottomBorderInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  required
                />
              </FadeUp>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" />
                    <p className="text-xs font-semibold text-red-600">{error}</p>
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
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              </FadeUp>

              <FadeUp delay={0.41}>
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex w-full items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-extrabold text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-2xs transition-all cursor-pointer"
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

              <FadeUp delay={0.42} className="flex flex-col items-center gap-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-center w-full text-xs font-semibold text-gray-500">
                  <Link
                    to="/forgot-password"
                    className="text-gray-400 underline underline-offset-4 transition-colors hover:text-red-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="w-full pt-2">
                  <Link
                    to="/register-volunteer"
                    className="flex w-full items-center justify-center gap-2 py-2.5 px-4 text-xs font-black text-red-950 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all shadow-2xs group"
                  >
                    <span>Want to join emergency response?</span>
                    <span className="text-red-700 underline group-hover:text-red-800 font-black">
                      Register as Volunteer 🤝
                    </span>
                  </Link>
                </div>
              </FadeUp>

            </form>
          </motion.div>

        </div>
      </div>

    </div>
  )
}
