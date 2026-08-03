import { useState } from 'react'
import { toggleAvailability } from '@/services/volunteers.service'
import type { Volunteer } from '@/types/volunteer'
import { MapPin, Phone } from 'lucide-react'

export default function VolunteerCard({ volunteer }: { volunteer: Volunteer }) {
  const [available, setAvailable] = useState(volunteer.is_available)

  const handleToggle = async () => {
    await toggleAvailability(volunteer.id, !available)
    setAvailable(!available)
  }

  return (
    <div className="flex flex-col gap-3 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 shrink-0 items-center justify-center text-sm font-extrabold text-white"
            style={{ background: '#b91c1c', borderRadius: 5 }}
          >
            {(volunteer.profiles?.full_name?.[0] ?? '?').toUpperCase()}
          </div>
          <p className="text-sm font-extrabold text-gray-900">{volunteer.profiles?.full_name ?? 'Unknown'}</p>
        </div>
        <span
          className="px-2 py-0.5 text-[11px] font-semibold"
          style={{
            borderRadius: 5,
            border: '1px solid',
            borderColor: available ? '#bbf7d0' : '#e5e7eb',
            background: available ? '#f0fdf4' : '#f9fafb',
            color: available ? '#15803d' : '#6b7280',
          }}
        >
          {available ? 'Available' : 'Unavailable'}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1">
        {volunteer.profiles?.barangay && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin size={11} /> {volunteer.profiles.barangay}
          </span>
        )}
        {volunteer.profiles?.phone && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Phone size={11} /> {volunteer.profiles.phone}
          </span>
        )}
      </div>

      {/* Skills */}
      {volunteer.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {volunteer.skills.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 text-[11px] font-medium text-gray-500"
              style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={handleToggle}
        className="w-full py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700"
        style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
      >
        Toggle Availability
      </button>
    </div>
  )
}
