import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { registerAgencyAccount } from '@/services/responseAgencies.service'
import type { AgencyCategory, AgencyContact } from '@/types/responseAgency'
import {
  Building2, Phone, Plus, X, Lock, User, Mail, MapPin,
  ShieldCheck, AlertTriangle, Eye, EyeOff, CheckCircle2, Copy, Check,
  LocateFixed, Map, Clock, ShieldAlert,
} from 'lucide-react'
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import mainLogo from '@/assets/logo/main_logo.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''

const CATEGORIES: { id: AgencyCategory; label: string; desc: string }[] = [
  { id: 'fire', label: 'Fire Sub-Station', desc: 'BFP Fire suppression & hazmat' },
  { id: 'police', label: 'Police Station', desc: 'PNP Crowd control & security' },
  { id: 'medical', label: 'Emergency Medical', desc: 'Ambulance & hospital trauma care' },
  { id: 'rescue', label: 'DRRMO Rescue', desc: 'Landslide & heavy flood rescue' },
  { id: 'military', label: 'Coast Guard / Military', desc: 'Maritime rescue & water hazards' },
  { id: 'ngo', label: 'Red Cross / NGO', desc: 'Relief & volunteer teams' },
  { id: 'other', label: 'Other Unit', desc: 'Special response division' },
]

const CONTACT_LABELS = ['hotline', 'mobile', 'landline', 'fax', 'viber', 'radio']

export default function AgencyRegistrationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const expParam = searchParams.get('exp')

  // Expiration State & Live Countdown Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(() => {
    if (expParam) {
      const expiry = Number(expParam)
      if (isNaN(expiry)) return null
      return Math.floor((expiry - Date.now()) / 1000)
    }
    return null
  })

  useEffect(() => {
    if (!expParam) return
    const expiry = Number(expParam)
    if (isNaN(expiry)) return

    const interval = setInterval(() => {
      const diff = Math.floor((expiry - Date.now()) / 1000)
      setTimeLeftSeconds(diff)
      if (diff <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expParam])

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Form State
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AgencyCategory>('fire')
  const [categoryOtherSpecify, setCategoryOtherSpecify] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [equipmentNotes, _setEquipmentNotes] = useState('')

  // Hotlines State
  const [contacts, setContacts] = useState<AgencyContact[]>([
    { label: 'hotline', value: '' },
    { label: 'mobile', value: '' },
  ])

  // Credential State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Location Picker State
  const [locating, setLocating] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 10.3157, lng: 123.8854 }) // Cebu City default
  const [selectedPin, setSelectedPin] = useState<{ lat: number; lng: number } | null>(null)
  const [reverseLoading, setReverseLoading] = useState(false)

  // Status State
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successModal, setSuccessModal] = useState(false)
  const [copiedCreds, setCopiedCreds] = useState(false)

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.display_name) {
        return data.display_name
      }
      return null
    } catch {
      return null
    }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatitude(lat.toFixed(6))
        setLongitude(lng.toFixed(6))
        setMapCenter({ lat, lng })
        setSelectedPin({ lat, lng })

        const addr = await reverseGeocode(lat, lng)
        if (addr) {
          setAddress(addr)
        }
        setLocating(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setError('Could not retrieve GPS location. Please grant location access or pick on map.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleConfirmMapSelection = async () => {
    if (!selectedPin) return
    setLatitude(selectedPin.lat.toFixed(6))
    setLongitude(selectedPin.lng.toFixed(6))

    setReverseLoading(true)
    const addr = await reverseGeocode(selectedPin.lat, selectedPin.lng)
    if (addr) {
      setAddress(addr)
    }
    setReverseLoading(false)
    setShowMapModal(false)
  }

  const addContact = () => {
    setContacts((prev) => [...prev, { label: 'mobile', value: '' }])
  }

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return
    setContacts((prev) => prev.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: keyof AgencyContact, val: string) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Agency Name is required.')
    if (category === 'other' && !categoryOtherSpecify.trim()) {
      return setError('Please specify your unit / category type.')
    }
    if (!address.trim()) return setError('Station Address is required.')
    if (!username.trim()) return setError('Username for agency account is required.')
    if (username.length < 3) return setError('Username must be at least 3 characters.')
    if (!password) return setError('Password is required.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    const validContacts = contacts.filter((c) => c.value.trim() !== '')
    if (validContacts.length === 0) {
      return setError('Please provide at least one valid emergency hotline / contact number.')
    }

    setSubmitting(true)
    try {
      await registerAgencyAccount({
        name: name.trim(),
        category,
        category_other_specify: category === 'other' ? categoryOtherSpecify.trim() : null,
        email: email.trim() || null,
        address: address.trim() || null,
        contacts: validContacts,
        username: username.trim(),
        password,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        equipment_notes: equipmentNotes.trim() || null,
      })

      setSubmitting(false)
      setSuccessModal(true)
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      setSubmitting(false)
    }
  }

  const handleCopyCredentials = () => {
    const credText = `RescueLink AI Agency Registration\nAgency: ${name}\nUsername: ${username}\nPassword: ${password}`
    navigator.clipboard.writeText(credText)
    setCopiedCreds(true)
    setTimeout(() => setCopiedCreds(false), 2500)
  }

  if (!expParam || (timeLeftSeconds !== null && timeLeftSeconds <= 0)) {
    return (
      <div className="min-h-screen bg-gray-50/60 font-sans flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white p-8 shadow-xs text-center flex flex-col items-center gap-4" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert size={36} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {!expParam ? 'Access Restricted' : 'Registration Link Expired'}
            </h2>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              {!expParam
                ? 'Direct access to the Response Agency Registration page is restricted. You must access this page via a valid temporary registration link generated by your LGU Administrator.'
                : 'This agency registration link was set with a temporary access window and has now expired. Please contact your Local Government Unit (LGU) Administrator to request a new registration link.'}
            </p>
          </div>
          <div className="w-full pt-2">
            <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
              Return to Agency Portal Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/60 font-sans flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[620px]">

        {/* Top Expiration Countdown Banner if active link */}
        {timeLeftSeconds !== null && (
          <div className="w-full mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900 font-semibold shadow-xs">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-600 animate-pulse" />
              <span>Temporary Registration Link Active</span>
            </div>
            <span className="font-mono text-xs font-extrabold bg-amber-200/80 px-2.5 py-1 rounded text-amber-950">
              ⏱️ Link Expires in {formatTimeLeft(timeLeftSeconds)}
            </span>
          </div>
        )}

        {/* Top Branding Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src={mainLogo} alt="RescueLink AI" className="w-24 object-contain shadow-xs" style={{ borderRadius: 10 }} />
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Register Response Agency</h2>
            <p className="mt-1 text-sm text-gray-400">Register agency details, emergency hotlines & portal credentials</p>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 shadow-xs" style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Agency Name */}
              <Input
                label="Official Agency / Unit Name *"
                type="text"
                placeholder="e.g. BFP Labangon Fire Sub-Station"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<Building2 size={14} />}
                required
              />

              {/* Category Selector (Matching Signup.tsx Role Selector) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Agency Category & Specialization *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(({ id: catId, label, desc }) => (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => setCategory(catId)}
                      className="flex flex-col items-start gap-0.5 p-2.5 text-left transition-all"
                      style={{
                        border: category === catId ? '1.5px solid #b91c1c' : '1.5px solid #e5e7eb',
                        borderRadius: 5,
                        background: category === catId ? '#fef2f2' : '#fff',
                        boxShadow: category === catId ? '0 0 0 3px rgba(185,28,28,0.07)' : 'none',
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={`text-[12px] font-bold ${category === catId ? 'text-red-700' : 'text-gray-700'}`}>
                          {label}
                        </span>
                        {category === catId && <ShieldCheck size={12} className="text-red-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-gray-400 line-clamp-1">{desc}</span>
                    </button>
                  ))}
                </div>

                {category === 'other' && (
                  <div className="mt-1">
                    <Input
                      label="Specify Other Unit / Specialization Type *"
                      type="text"
                      placeholder="e.g. K9 Search & Rescue, Drone Unit, Bomb Squad"
                      value={categoryOtherSpecify}
                      onChange={(e) => setCategoryOtherSpecify(e.target.value)}
                      icon={<Building2 size={14} />}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Station Address with GPS & Map Pick buttons */}
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Station / Physical Address *"
                  type="text"
                  placeholder="Katipunan St, Barangay Labangon, Cebu City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  icon={<MapPin size={14} />}
                  required
                />

                {/* Location Quick Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-md transition-all shrink-0 cursor-pointer"
                  >
                    <LocateFixed size={12} className={locating ? 'animate-spin text-red-600' : 'text-emerald-600'} />
                    {locating ? 'Locating GPS…' : latitude ? `✓ GPS: ${latitude}, ${longitude}` : 'Use Current Location 📍'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedPin && latitude && longitude) {
                        setSelectedPin({ lat: parseFloat(latitude), lng: parseFloat(longitude) })
                        setMapCenter({ lat: parseFloat(latitude), lng: parseFloat(longitude) })
                      } else if (!selectedPin) {
                        setSelectedPin({ lat: 10.3157, lng: 123.8854 })
                      }
                      setShowMapModal(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md transition-all shrink-0 cursor-pointer"
                  >
                    <Map size={12} className="text-red-600" />
                    {latitude ? 'Change Pin on Map 🗺️' : 'Select on Interactive Map 🗺️'}
                  </button>
                </div>
              </div>

              {/* Official Email */}
              <Input
                label="Official Email Address"
                type="email"
                placeholder="station@cebucity.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={14} />}
              />

              {/* Emergency Hotlines Section */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Dispatch Hotlines & Contact Numbers *
                  </label>
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800"
                  >
                    <Plus size={12} /> Add Hotline
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {contacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={contact.label}
                        onChange={(e) => updateContact(idx, 'label', e.target.value)}
                        className="px-2 py-2 text-[11px] font-semibold text-gray-700 outline-none capitalize shrink-0"
                        style={{ border: '1.5px solid #e5e7eb', borderRadius: 5, minWidth: 95 }}
                      >
                        {CONTACT_LABELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>

                      <div className="flex-1">
                        <Input
                          placeholder="e.g. (032) 261-2222 or 0917-123-4567"
                          value={contact.value}
                          onChange={(e) => updateContact(idx, 'value', e.target.value)}
                          icon={<Phone size={13} />}
                        />
                      </div>

                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="text-gray-300 hover:text-red-600 p-1"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Credentials */}
              <div className="pt-2 border-t border-gray-100 flex flex-col gap-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Agency Portal Account Credentials
                </div>

                <Input
                  label="Username / Login ID *"
                  type="text"
                  placeholder="bfp_labangon_main"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  icon={<User size={14} />}
                  required
                />

                <Input
                  label="Password *"
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

                <Input
                  label="Confirm Password *"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock size={14} />}
                  required
                />
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

              {/* Submit Button */}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
                {submitting ? 'Registering Agency…' : 'Register Response Agency'}
              </Button>

              <div className="text-center pt-1">
                <span className="text-[12px] text-gray-400">Already registered? </span>
                <Link to="/login" className="text-[12px] font-semibold text-red-700 underline underline-offset-4 hover:text-red-800">
                  Sign in to agency portal
                </Link>
              </div>

            </form>
          </div>

          <p className="mt-5 text-center text-[11px] text-gray-400">
            Authorized response agencies & emergency service providers only
          </p>

        </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 text-center" style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div className="size-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-lg font-extrabold text-gray-900">
              Agency Registered Successfully! 🎉
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              <strong className="text-gray-900">{name}</strong> has been registered in the RescueLink AI network.
            </p>

            <div className="my-4 p-3.5 bg-gray-50 text-left flex flex-col gap-1.5 text-xs" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
              <div className="flex items-center justify-between font-bold text-[11px] text-gray-400 uppercase tracking-wide border-b border-gray-200 pb-1.5">
                <span>Account Credentials</span>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="flex items-center gap-1 text-red-700 hover:text-red-800 normal-case"
                >
                  {copiedCreds ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCreds ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Username:</span>
                <span className="text-gray-900 font-mono font-bold">{username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Password:</span>
                <span className="text-gray-900 font-mono font-bold">{password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registered Hotlines:</span>
                <span className="text-emerald-700 font-bold">{contacts.length} numbers</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="button" variant="primary" size="lg" fullWidth onClick={() => navigate('/login')}>
                Proceed to Agency Sign In →
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSuccessModal(false)
                  setName('')
                  setUsername('')
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 py-1"
              >
                Register Another Agency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map Picker Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 text-red-700">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Pin Station Location on Map</h3>
                  <p className="text-xs text-gray-500">Click anywhere on the map to set the exact station coordinates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Map Canvas View */}
            <div className="relative w-full h-[360px] bg-gray-100 overflow-hidden">
              <APIProvider apiKey={API_KEY}>
                <GoogleMap
                  defaultCenter={mapCenter}
                  defaultZoom={14}
                  mapId="agency-picker-map"
                  style={{ width: '100%', height: '100%' }}
                  gestureHandling="greedy"
                  onClick={(e) => {
                    if (e.detail.latLng) {
                      setSelectedPin({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng })
                    }
                  }}
                >
                  {selectedPin && (
                    <AdvancedMarker position={selectedPin}>
                      <div className="relative flex flex-col items-center cursor-pointer -translate-x-1/2 -translate-y-full select-none">
                        <div className="flex items-center justify-center p-2 bg-red-600 text-white rounded-full shadow-2xl border-2 border-white ring-4 ring-red-400/40 animate-bounce">
                          <MapPin size={24} className="fill-white/20" />
                        </div>
                        <div className="w-3 h-3 bg-red-700 rounded-full shadow-md -mt-1 border border-white" />
                      </div>
                    </AdvancedMarker>
                  )}
                </GoogleMap>
              </APIProvider>

              {/* Selected Pin Badge Overlay */}
              {selectedPin && (
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs px-3 py-2 border border-gray-200 shadow-md rounded-lg flex items-center gap-2 text-xs font-semibold z-10">
                  <span className="size-2 rounded-full bg-red-600 animate-ping" />
                  <span>Selected Pin: <strong className="font-mono text-red-700">{selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}</strong></span>
                </div>
              )}

              <div className="absolute bottom-4 right-4 bg-black/75 text-white px-3 py-1.5 text-[11px] font-semibold rounded-md backdrop-blur-xs pointer-events-none z-10">
                💡 Click on map to place or reposition pin
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {selectedPin ? (
                  <span>Selected Pin: <strong className="text-gray-900">{selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}</strong></span>
                ) : (
                  <span>No location selected yet</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmMapSelection}
                  disabled={!selectedPin || reverseLoading}
                  loading={reverseLoading}
                >
                  {reverseLoading ? 'Fetching Address…' : 'Confirm Location Selection ✓'}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
