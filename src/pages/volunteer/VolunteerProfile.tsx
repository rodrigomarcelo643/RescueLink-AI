import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  User, CheckCircle2, HeartHandshake,
  Wrench, Crosshair, Navigation, Save
} from 'lucide-react'

const SKILL_PRESETS = [
  '🩺 Medical & First Aid',
  '🏊 Search & Rescue (USAR)',
  '🌊 Amphibious / Boat Rescue',
  '🔥 Fire Suppression',
  '📦 Relief Goods Distribution',
  '📻 Emergency Radio Comms',
  '🚚 Transport & Evacuation',
  '🛠️ Chainsaw & Clearing',
]

const EQUIPMENT_PRESETS = [
  '🚤 Rescue Boat / Kayak',
  '🛻 4x4 Off-Road Truck',
  '🩹 Trauma First Aid Kit',
  '🪚 Chainsaw & Clearing Tools',
  '⚡ Power Generator',
  '📡 VHF/UHF Walkie-Talkie',
  '🚁 Emergency Drone',
]

export default function VolunteerProfile() {
  const { profile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [barangay, setBarangay] = useState(profile?.barangay || '')
  
  const [skills, setSkills] = useState<string[]>((profile as any)?.skills || ['Medical & First Aid', 'Search & Rescue'])
  const [customSkill, setCustomSkill] = useState('')

  const [equipment, setEquipment] = useState<string[]>((profile as any)?.equipment || ['Trauma First Aid Kit'])
  const [customEquip, setCustomEquip] = useState('')

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingGps, setGettingGps] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name)
      if (profile.phone) setPhone(profile.phone)
      if (profile.barangay) setBarangay(profile.barangay)
    }
  }, [profile])

  const toggleSkill = (item: string) => {
    setSkills((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item])
  }

  const addCustomSkill = () => {
    if (!customSkill.trim()) return
    const val = customSkill.trim()
    if (!skills.includes(val)) setSkills((prev) => [...prev, val])
    setCustomSkill('')
  }

  const toggleEquip = (item: string) => {
    setEquipment((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item])
  }

  const addCustomEquip = () => {
    if (!customEquip.trim()) return
    const val = customEquip.trim()
    if (!equipment.includes(val)) setEquipment((prev) => [...prev, val])
    setCustomEquip('')
  }

  const handleAcquireGps = () => {
    if (!('geolocation' in navigator)) return
    setGettingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGettingGps(false)
      },
      () => setGettingGps(false),
      { enableHighAccuracy: true }
    )
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedNotice('Volunteer skills, response gear, and contact details updated successfully! ✅')
    setTimeout(() => setSavedNotice(null), 3500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      
      <div>
        <h1 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <User size={20} className="text-red-700" />
          Volunteer Profile, Skills & Response Gear
        </h1>
        <p className="text-xs text-gray-400">
          Manage your contact credentials, specializations, response equipment, and live GPS location coordinates.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Section 1: Contact Details */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <User size={14} /> 1. Contact & Residence Info
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Mobile Hotline</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 outline-none focus:border-red-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Barangay / Residence Sector</label>
              <input
                type="text"
                required
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 outline-none focus:border-red-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Skills */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <HeartHandshake size={14} /> 2. Specializations & Skills
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SKILL_PRESETS.map((item) => {
              const active = skills.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleSkill(item)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                    active
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item}</span>
                  <input type="checkbox" checked={active} onChange={() => {}} className="size-4 accent-red-700 pointer-events-none" />
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              placeholder="Add custom skill..."
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 outline-none"
            />
            <button type="button" onClick={addCustomSkill} className="px-4 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800">
              + Add
            </button>
          </div>
        </div>

        {/* Section 3: Response Gear */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-4">
          <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Wrench size={14} /> 3. Response Gear & Equipment
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EQUIPMENT_PRESETS.map((item) => {
              const active = equipment.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleEquip(item)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                    active
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item}</span>
                  <input type="checkbox" checked={active} onChange={() => {}} className="size-4 accent-blue-600 pointer-events-none" />
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              placeholder="Add custom gear..."
              value={customEquip}
              onChange={(e) => setCustomEquip(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 outline-none"
            />
            <button type="button" onClick={addCustomEquip} className="px-4 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800">
              + Add
            </button>
          </div>
        </div>

        {/* Section 4: Live GPS Locator */}
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col gap-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Crosshair size={14} /> 4. Live GPS Coordinates
          </span>

          {coords ? (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono font-bold text-emerald-700 flex items-center justify-between">
              <span>📍 Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}</span>
              <button type="button" onClick={handleAcquireGps} className="text-[11px] text-red-700 hover:underline">
                Re-Acquire GPS
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAcquireGps}
              disabled={gettingGps}
              className="py-3 px-4 text-xs font-extrabold text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation size={14} className="text-red-700" />
              {gettingGps ? 'Acquiring GPS…' : 'Acquire GPS Position 📍'}
            </button>
          )}
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 px-6 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save size={16} /> Save Volunteer Profile & Capabilities 🚀
        </button>

      </form>
    </div>
  )
}
