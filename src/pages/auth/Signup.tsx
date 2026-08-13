import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { AlertTriangle, Mail, Lock, Eye, EyeOff, User, ShieldCheck } from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserRole } from '@/context/AuthContext'

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'admin',     label: 'Admin',        desc: 'System administrator' },
  { value: 'lgu',       label: 'LGU Officer',  desc: 'Local government unit personnel' },
  { value: 'ngo',       label: 'NGO',          desc: 'Non-government organization' },
  { value: 'volunteer', label: 'Volunteer',    desc: 'Field rescue volunteer' },
  { value: 'citizen',   label: 'Citizen',      desc: 'General public / reporter' },
]

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('citizen')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    // update role on profile (trigger creates it)
    if (data.user) {
      await supabase.from('profiles').update({ role }).eq('id', data.user.id)
    }
    navigate('/')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* ── Left panel ── */}
      <div
        className="relative hidden w-[48%] flex-col items-center justify-center gap-8 bg-white p-16 lg:flex"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <img src={mainLogo} alt="RescueLink AI" className="w-64 object-contain" style={{ borderRadius: 12 }} />
        <div className="text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">RescueLink AI</h1>
          <p className="mt-1 text-sm font-medium text-gray-400">Rescue & Relief Coordination Platform</p>
        </div>
        <div
          className="flex w-full max-w-xs divide-x divide-gray-100 overflow-hidden"
          style={{ border: '1px solid #f0f0f0', borderRadius: 5 }}
        >
          {[{ n: '24/7', d: 'Monitoring' }, { n: '3+', d: 'Channels' }, { n: 'AI', d: 'Powered' }].map(({ n, d }) => (
            <div key={d} className="flex flex-1 flex-col items-center py-3">
              <span className="text-base font-extrabold text-gray-900">{n}</span>
              <span className="text-[11px] font-medium text-gray-400">{d}</span>
            </div>
          ))}
        </div>
        <p className="absolute bottom-8 text-[11px] text-gray-300">
          © {new Date().getFullYear()} RescueLink AI · Philippines
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-[500px]">

          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <img src={mainLogo} alt="RescueLink AI" className="w-28 object-contain" style={{ borderRadius: 8 }} />
          </div>

          <div className="mb-7 text-center lg:text-left md:text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Create account</h2>
            <p className="mt-1.5 text-sm text-gray-400">Sign up to get started</p>
          </div>

          <div className="bg-white p-6" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <Input
                label="Full Name"
                type="text"
                placeholder="Juan dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User size={14} />}
                required
              />

              {/* Role selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className="flex flex-col items-start gap-0.5 p-3 text-left transition-all"
                      style={{
                        border: role === value ? '1.5px solid #b91c1c' : '1.5px solid #e5e7eb',
                        borderRadius: 5,
                        background: role === value ? '#fef2f2' : '#fff',
                        boxShadow: role === value ? '0 0 0 3px rgba(185,28,28,0.07)' : 'none',
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={`text-[12px] font-bold ${ role === value ? 'text-red-700' : 'text-gray-700' }`}>
                          {label}
                        </span>
                        {role === value && <ShieldCheck size={12} className="text-red-600" />}
                      </div>
                      <span className="text-[11px] text-gray-400">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={14} />}
                required
              />

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

              {error && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5 }}
                >
                  <AlertTriangle size={13} className="mt-px shrink-0 text-red-600" />
                  <p className="text-[12px] font-semibold text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </Button>

              <div className="text-center">
                <span className="text-[12px] text-gray-400">Already have an account? </span>
                <Link to="/login" className="text-[12px] font-semibold text-red-700 underline underline-offset-4 hover:text-red-800">
                  Sign in
                </Link>
              </div>

            </form>
          </div>

          <p className="mt-5 text-center text-[11px] text-gray-400">
            Authorized personnel only
          </p>

        </div>
      </div>

    </div>
  )
}
