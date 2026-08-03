import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { resetPassword } from '@/services/auth.service'
import { Mail, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FadeUp, FadeIn } from '@/components/shared/MotionWrappers'

const ease = [0.22, 1, 0.36, 1] as const

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await resetPassword(email)
    if (error) setError(error.message)
    else setSent(true)
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

          <AnimatePresence mode="wait">
            {!sent ? (

              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <FadeUp delay={0.1} className="mb-7">
                  <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Forgot password?</h2>
                  <p className="mt-1.5 text-sm text-gray-400">Enter your email and we'll send you a reset link.</p>
                </FadeUp>

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
                        label="Email"
                        type="email"
                        placeholder="you@rescuelink.ph"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail size={14} />}
                        required
                      />
                    </FadeUp>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          className="flex items-start gap-2 px-3 py-2.5"
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5 }}
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <AlertTriangle size={13} className="mt-px shrink-0 text-red-600" />
                          <p className="text-[12px] font-semibold text-red-600">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <FadeUp delay={0.32}>
                      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                        {loading ? 'Sending…' : 'Send Reset Link'}
                      </Button>
                    </FadeUp>

                  </form>
                </motion.div>

                <FadeUp delay={0.42} className="mt-5 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 underline underline-offset-4 transition-colors hover:text-red-700"
                  >
                    <ArrowLeft size={12} /> Back to Sign In
                  </Link>
                </FadeUp>
              </motion.div>

            ) : (

              /* ── Success state ── */
              <motion.div
                key="success"
                className="flex flex-col items-center gap-5 text-center"
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
              >
                <motion.div
                  className="flex size-14 items-center justify-center"
                  style={{ background: '#f0fdf4', borderRadius: 5 }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1, ease }}
                >
                  <CheckCircle size={26} className="text-green-600" />
                </motion.div>

                <FadeUp delay={0.15}>
                  <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Check your email</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    We sent a reset link to <span className="font-semibold text-gray-700">{email}</span>.
                    <br />It may take a few minutes to arrive.
                  </p>
                </FadeUp>

                <FadeUp
                  delay={0.25}
                  className="w-full bg-white p-4"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
                >
                  <p className="text-xs text-gray-400">
                    Didn't receive it?{' '}
                    <button
                      onClick={() => { setSent(false); setEmail('') }}
                      className="font-semibold text-red-600 underline underline-offset-4 hover:text-red-700"
                    >
                      Try again
                    </button>
                  </p>
                </FadeUp>

                <FadeUp delay={0.32}>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 underline underline-offset-4 transition-colors hover:text-red-700"
                  >
                    <ArrowLeft size={12} /> Back to Sign In
                  </Link>
                </FadeUp>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

    </div>
  )
}
