import {
  X, Building2, MapPin, Users, Phone, Zap, Droplets, HeartPulse, PackageCheck,
  Navigation, ShieldCheck
} from 'lucide-react'

export interface EvacuationCenterInfo {
  name: string
  address: string
  distanceKm: number
  capacity: number
  occupied: number
  status: 'open' | 'full' | 'closed'
  contact: string
  facilities: string[]
  lat: number
  lng: number
}

interface Props {
  open: boolean
  onClose: () => void
  center: EvacuationCenterInfo | null
  userCoords?: { lat: number; lng: number }
}

export default function EvacuationCenterDetailsModal({ open, onClose, center, userCoords }: Props) {
  if (!open || !center) return null

  const availableSpots = Math.max(0, center.capacity - center.occupied)
  const occupancyPct = Math.min(100, Math.round((center.occupied / center.capacity) * 100))

  const handleOpenGoogleMaps = () => {
    const destination = `${center.lat},${center.lng}`
    const origin = userCoords ? `${userCoords.lat},${userCoords.lng}` : ''
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-800/80 border border-purple-600 text-purple-300 shadow-md shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded">
                  🟢 {center.status.toUpperCase()} & ACCEPTING EVACUEES
                </span>
                <span className="text-[10px] font-bold text-purple-300">
                  {center.distanceKm} km away
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">{center.name}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-gray-900">

          {/* Location Address & Navigation */}
          <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
              <MapPin size={15} className="text-red-600 shrink-0" />
              <span>{center.address}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-purple-800 pt-2 border-t border-purple-200/70">
              <span>GPS Coordinates: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</span>
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                className="text-purple-900 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Navigation size={12} className="text-blue-600" /> Live Directions ↗
              </button>
            </div>
          </div>

          {/* Live Capacity Bar */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Users size={14} className="text-purple-600" /> Shelter Occupancy Capacity
              </span>
              <span className="text-xs font-extrabold text-purple-900 font-mono">
                {center.occupied} / {center.capacity} Capacity ({occupancyPct}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPct > 90 ? 'bg-red-600' : occupancyPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${occupancyPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                ✅ {availableSpots} Evacuation Spots Available
              </span>
              <span className="text-gray-500">
                Hotline: <a href={`tel:${center.contact}`} className="text-blue-700 hover:underline">{center.contact}</a>
              </span>
            </div>
          </div>

          {/* On-Site Facilities & Amenities */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-600" /> On-Site Relief Facilities & Supplies
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-xs font-bold text-gray-800">
                <Zap size={14} className="text-amber-500 shrink-0" />
                <span>Backup Power Generators</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-xs font-bold text-gray-800">
                <Droplets size={14} className="text-blue-500 shrink-0" />
                <span>Potable Water Station</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-xs font-bold text-gray-800">
                <HeartPulse size={14} className="text-red-500 shrink-0" />
                <span>Red Cross Medical Clinic</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-xs font-bold text-gray-800">
                <PackageCheck size={14} className="text-emerald-600 shrink-0" />
                <span>DSWD Relief Packs</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Close Window
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${center.contact}`}
              className="px-4 py-2 text-xs font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-all"
            >
              <Phone size={13} /> Call Center Hotline
            </a>

            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Navigation size={14} /> Navigate to Evacuation Center 🧭
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
