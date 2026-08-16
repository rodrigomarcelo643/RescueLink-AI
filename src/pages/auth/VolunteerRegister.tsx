import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerVolunteerAccount } from '@/services/volunteers.service'
import {
  AlertTriangle, Mail, Lock, Eye, EyeOff, User, Phone, MapPin,
  Crosshair, CheckCircle2, ShieldCheck, Wrench
} from 'lucide-react'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SKILL_PRESETS = [
  { value: 'First Aid & Medical', label: '🩺 Medical & First Aid' },
  { value: 'Search & Rescue', label: '🏊 Search & Rescue (USAR)' },
  { value: 'Boat Rescue', label: '🌊 Amphibious / Boat Rescue' },
  { value: 'Firefighting', label: '🔥 Fire Suppression' },
  { value: 'Relief Logistics', label: '📦 Relief Goods & Logistics' },
  { value: 'Radio Communications', label: '📻 Emergency Radio Comms' },
  { value: 'Transport', label: '🚚 Transport & Evacuation' },
  { value: 'Chainsaw & Clearing', label: '🛠️ Chainsaw & Clearing' },
]

const EQUIPMENT_PRESETS = [
  { value: 'Rescue Boat', label: '🚤 Rescue Boat / Kayak' },
  { value: '4x4 Truck', label: '🛻 4x4 Off-Road Truck' },
  { value: 'First Aid Kit', label: '🩹 Trauma First Aid Kit' },
  { value: 'Chainsaw', label: '🪚 Chainsaw & Clearing Tools' },
  { value: 'Generator', label: '⚡ Power Generator' },
  { value: 'Walkie-Talkie', label: '📡 VHF/UHF Walkie-Talkie' },
  { value: 'Drone', label: '🚁 Emergency Drone' },
]

export default function VolunteerRegister() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [barangay, setBarangay] = useState('')

  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')

  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [customEquip, setCustomEquip] = useState('')

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingGps, setGettingGps] = useState(false)
  const [gpsError, setGpsError] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const addCustomSkill = () => {
    if (!customSkill.trim()) return
    const val = customSkill.trim()
    if (!selectedSkills.includes(val)) {
      setSelectedSkills((prev) => [...prev, val])
    }
    setCustomSkill('')
  }

  const toggleEquip = (equip: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equip) ? prev.filter((e) => e !== equip) : [...prev, equip]
    )
  }

  const addCustomEquip = () => {
    if (!customEquip.trim()) return
    const val = customEquip.trim()
    if (!selectedEquipment.includes(val)) {
      setSelectedEquipment((prev) => [...prev, val])
    }
    setCustomEquip('')
  }

  const handleAcquireGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }

    setGettingGps(true)
    setGpsError('')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGettingGps(false)
      },
      (err) => {
        setGpsError(err.message || 'Failed to acquire GPS coordinates.')
        setGettingGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return setError('Full name is required.')
    if (!email.trim()) return setError('Email address is required.')
    if (!password || password.length < 6) return setError('Password must be at least 6 characters.')
    if (!phone.trim()) return setError('Contact number is required.')
    if (!barangay.trim()) return setError('Barangay / Location is required.')
    if (selectedSkills.length === 0) return setError('Please select at least 1 skill.')

    setLoading(true)
    setError('')

    try {
      await registerVolunteerAccount({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim(),
        barangay: barangay.trim(),
        skills: selectedSkills,
        equipment: selectedEquipment,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 font-sans text-gray-900">
      <div className="w-full max-w-[620px]">

        {/* Top Logo & Title Header (Same as Signup) */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src={mainLogo} alt="RescueLink AI" className="w-24 object-contain" style={{ borderRadius: 8 }} />
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Register as Volunteer</h2>
            <p className="mt-1 text-sm font-medium text-gray-400">Join the RescueLink AI Field Rescue Corps</p>
          </div>
        </div>

        {/* Main Form Box (Same style as Signup: border 1px solid #e5e7eb, borderRadius 5) */}
        <div className="bg-white p-6 sm:p-8" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
          
          {success ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-8">
              <div className="size-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Volunteer Registration Successful!</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Your volunteer account is now <span className="font-bold text-gray-900">Active</span>. Your deployment status is set to <span className="font-bold text-amber-700">Standby / Inactive</span> by default until you toggle ready.
              </p>
              <p className="text-xs font-semibold text-red-700 animate-pulse mt-2">
                Redirecting to sign-in page…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Full Name */}
              <Input
                label="Full Name *"
                type="text"
                placeholder="Juan dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User size={14} />}
                required
              />

              {/* Email & Phone in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={14} />}
                  required
                />

                <Input
                  label="Mobile Contact *"
                  type="text"
                  placeholder="09171234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  icon={<Phone size={14} />}
                  required
                />
              </div>

              {/* Password */}
              <Input
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
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

              {/* Barangay Location */}
              <Input
                label="Barangay / Residence Location *"
                type="text"
                placeholder="e.g. Barangay Labangon, Cebu City"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                icon={<MapPin size={14} />}
                required
              />

              {/* Skills Selector (Same Grid Button Styling as Role Selector in Signup.tsx) */}
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Volunteer Skills & Specializations *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_PRESETS.map(({ value, label }) => {
                    const active = selectedSkills.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleSkill(value)}
                        className="flex items-center justify-between p-2.5 text-left transition-all cursor-pointer"
                        style={{
                          border: active ? '1.5px solid #b91c1c' : '1.5px solid #e5e7eb',
                          borderRadius: 5,
                          background: active ? '#fef2f2' : '#fff',
                          boxShadow: active ? '0 0 0 3px rgba(185,28,28,0.07)' : 'none',
                        }}
                      >
                        <span className={`text-[12px] font-bold ${active ? 'text-red-700' : 'text-gray-700'}`}>
                          {label}
                        </span>
                        {active && <ShieldCheck size={12} className="text-red-600 shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Skill Input */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Add custom skill (e.g. Drone Pilot)..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    className="flex-1 h-9 px-3 bg-white text-xs font-medium text-gray-800 outline-none"
                    style={{ border: '1.5px solid #e5e7eb', borderRadius: 5 }}
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="h-9 px-3 py-1 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                    style={{ border: '1.5px solid #e5e7eb', borderRadius: 5 }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Equipment Selector */}
              <div className="flex flex-col gap-1.5 mt-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Response Gear & Equipment (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_PRESETS.map(({ value, label }) => {
                    const active = selectedEquipment.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleEquip(value)}
                        className="flex items-center justify-between p-2.5 text-left transition-all cursor-pointer"
                        style={{
                          border: active ? '1.5px solid #2563eb' : '1.5px solid #e5e7eb',
                          borderRadius: 5,
                          background: active ? '#eff6ff' : '#fff',
                          boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.07)' : 'none',
                        }}
                      >
                        <span className={`text-[12px] font-bold ${active ? 'text-blue-700' : 'text-gray-700'}`}>
                          {label}
                        </span>
                        {active && <Wrench size={12} className="text-blue-600 shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Gear Input */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Add custom gear (e.g. Life Jackets)..."
                    value={customEquip}
                    onChange={(e) => setCustomEquip(e.target.value)}
                    className="flex-1 h-9 px-3 bg-white text-xs font-medium text-gray-800 outline-none"
                    style={{ border: '1.5px solid #e5e7eb', borderRadius: 5 }}
                  />
                  <button
                    type="button"
                    onClick={addCustomEquip}
                    className="h-9 px-3 py-1 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                    style={{ border: '1.5px solid #e5e7eb', borderRadius: 5 }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* GPS Location Locator Widget */}
              <div className="flex flex-col gap-2 p-3.5 bg-gray-50 rounded-lg border border-gray-200 mt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <Crosshair size={13} className="text-red-600" /> Live GPS Coordinates
                  </label>
                  {coords && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      GPS Acquired ✅
                    </span>
                  )}
                </div>

                {coords ? (
                  <p className="text-xs font-mono font-bold text-gray-800">
                    📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleAcquireGps}
                    disabled={gettingGps}
                    className="w-full py-2 px-3 text-xs font-bold text-gray-800 bg-white hover:bg-gray-100 border border-gray-300 rounded shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MapPin size={13} className="text-red-600" />
                    {gettingGps ? 'Acquiring GPS…' : 'Acquire Current GPS Location 📍'}
                  </button>
                )}

                {gpsError && <p className="text-[11px] font-semibold text-red-600">⚠️ {gpsError}</p>}
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5 }}
                >
                  <AlertTriangle size={13} className="mt-px shrink-0 text-red-600" />
                  <p className="text-[12px] font-semibold text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button (Matches Signup button) */}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                {loading ? 'Creating volunteer profile…' : 'Register Volunteer Profile 🚀'}
              </Button>

              <div className="text-center pt-2">
                <span className="text-[12px] text-gray-400">Already registered? </span>
                <Link to="/login" className="text-[12px] font-semibold text-red-700 underline underline-offset-4 hover:text-red-800">
                  Sign in
                </Link>
              </div>

            </form>
          )}

        </div>

        <p className="mt-5 text-center text-[11px] text-gray-400">
          RescueLink AI · Authorized Volunteer Registration
        </p>

      </div>
    </div>
  )
}
