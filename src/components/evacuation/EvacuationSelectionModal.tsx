import {
  X, Building2, MapPin, CheckCircle2, ChevronRight
} from 'lucide-react'
import type { EvacuationCenter } from '@/types/evacuationCenter'

interface Props {
  open: boolean
  onClose: () => void
  centers: (EvacuationCenter & { distKm: number })[]
  selectedId: string | null
  onSelectCenter: (id: string) => void
  onOpenDetails: (center: EvacuationCenter) => void
  userCoords?: { lat: number; lng: number }
}

export default function EvacuationSelectionModal({
  open,
  onClose,
  centers,
  selectedId,
  onSelectCenter,
  onOpenDetails,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-800/80 border border-purple-600 text-purple-300 shadow-md shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-700 text-white rounded">
                  🏫 AI-RECOMMENDED EVACUATION DIRECTIVES
                </span>
                <span className="text-[10px] font-bold text-purple-300">
                  {centers.length} Available Shelters
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-white leading-snug">
                Select Target Evacuation Center
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                Shelters are automatically sorted by proximity to your current GPS position.
              </p>
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

        {/* Modal Body Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {centers.map((center) => {
            const isSelected = center.id === selectedId
            const availableSpots = Math.max(0, center.capacity - center.current_occupancy)
            const pct = Math.min(100, Math.round((center.current_occupancy / center.capacity) * 100))

            return (
              <div
                key={center.id}
                onClick={() => {
                  onSelectCenter(center.id)
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/90 shadow-md ring-2 ring-purple-300'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded flex items-center gap-1 ${
                      isSelected ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isSelected ? <CheckCircle2 size={11} /> : null}
                      {isSelected ? 'SELECTED EVACUATION TARGET' : 'AVAILABLE SHELTER'}
                    </span>
                    <span className="text-[11px] font-extrabold text-purple-900 font-mono">
                      {center.distKm} km away
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 leading-snug">
                    {center.name}
                  </h4>

                  <p className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="text-red-500 shrink-0" />
                    {center.barangay}, {center.municipality}
                  </p>

                  {/* Occupancy Progress */}
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] font-extrabold text-gray-600">
                      <span>Occupancy: {center.current_occupancy} / {center.capacity}</span>
                      <span>{pct}% Full</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 80 ? 'bg-red-600' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {availableSpots} spots left
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDetails(center)
                    }}
                    className="text-[11px] font-black text-purple-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Full Details <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-semibold">
            Click any shelter card to select it as your target evacuation directive.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-black text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-all cursor-pointer"
          >
            Confirm Selection
          </button>
        </div>

      </div>
    </div>
  )
}
